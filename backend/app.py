# app.py
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import text
from models import Sighting, SightingEvidence, db, Cryptid, EvidenceType

app = Flask(__name__)
CORS(app) 

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cryptid_tracker.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Create tables before first request
with app.app_context():
    db.create_all()

    # initialize with cryptids
    if not Cryptid.query.first():
        db.session.add_all([
            Cryptid(name="Bigfoot"), 
            Cryptid(name="Mothman"), 
            Cryptid(name="Loch Ness Monster")
        ])
        db.session.commit()

    # Seed Evidence Types if empty (so your checkboxes aren't blank!)
    if not EvidenceType.query.first():
        db.session.add_all([
            EvidenceType(name="Blurry Photo"), 
            EvidenceType(name="Audio Recording"), 
            EvidenceType(name="Footprint Cast")
        ])
        db.session.commit()

@app.route('/api/form-data', methods=['GET'])
def get_form_data():
    cryptids = Cryptid.query.all()
    evidence_types = EvidenceType.query.all()
    
    return jsonify({
        "cryptids": [{"id": c.id, "name": c.name} for c in cryptids],
        "evidence_types": [{"id": e.id, "name": e.name} for e in evidence_types]
    })

@app.route('/api/sightings', methods=['POST', 'OPTIONS'])
def add_sighting():
    if request.method == 'OPTIONS':
        return jsonify({"message": "Preflight OK"}), 200
        
    data = request.json

    # Explicit sanity checks
    date_str = data.get('date_sighted', '')
    try:
        date_val = datetime.strptime(date_str, "%Y-%m-%d").date()
        if date_val > datetime.now().date():
            return jsonify({"error": "Invalid input: Date cannot be in the future. You're (most likely) not a time traveller"}), 400
    except ValueError:
        return jsonify({"error": "Invalid input: Date must follow YYYY-MM-DD format."}), 400
    
    location = str(data.get('location', '')).strip()
    if len(location) == 0 or len(location) > 200:
        return jsonify({"error": "Invalid input: Location must be between 1 and 200 characters."}), 400
        
    try:
        score = int(data.get('credibility_score', 0))
        if not (1 <= score <= 10):
            return jsonify({"error": "Invalid input: Credibility score must be between 1 and 10."}), 400
    except ValueError:
        return jsonify({"error": "Invalid input: Credibility score must be a number."}), 400

    cryptid_id_raw = data.get('cryptid_id')
    new_cryptid_name = str(data.get('new_cryptid_name', '')).strip()
    
    if cryptid_id_raw == 'new':
        if len(new_cryptid_name) == 0 or len(new_cryptid_name) > 50:
            return jsonify({"error": "Invalid input: New cryptid name must be between 1 and 50 characters."}), 400
            
    # transaction
    try:
        with db.session.begin(): 
            # backoff and retry strategy, user B will wait for user A to finish
            db.session.execute(text("PRAGMA busy_timeout = 5000"))          
            db.session.execute(text('BEGIN IMMEDIATE')) # get write lock  
            if cryptid_id_raw == 'new':
                # Check if the cryptid already exists in the database
                existing_cryptid = Cryptid.query.filter_by(name=new_cryptid_name).first()
                if existing_cryptid:
                    # transaction not complete so rollback
                    db.session.rollback()
                    return jsonify({"error": f"Invalid input: '{new_cryptid_name}' already exists in the database. Please select it from the dropdown menu."}), 400

                # Create the new creature
                new_cryptid = Cryptid(name=new_cryptid_name)
                db.session.add(new_cryptid)
                db.session.flush() # Get the new ID before the transaction finishes
                actual_cryptid_id = new_cryptid.id
            else:
                actual_cryptid_id = int(cryptid_id_raw)

            # Add to Main Table
            new_sighting = Sighting(
                cryptid_id=actual_cryptid_id, 
                date_sighted=date_str,
                location=location, 
                credibility_score=score
            )
            db.session.add(new_sighting)
            db.session.flush()

            # Add to Supporting Table (The Many-to-Many relationship)
            for ev_id in data.get('evidence_ids', []):
                new_evidence = SightingEvidence(
                    sighting_id=new_sighting.id,
                    evidence_type_id=ev_id
                )
                db.session.add(new_evidence)
                
        return jsonify({"message": "Sighting logged successfully!"}), 201
        # commit is automatically called by SQLAlchemy when we leave the with block
    except Exception as e:
        # session automatically rollsback if error
        print(f"Transaction Error: {e}")
        return jsonify({"error": "Transaction failed: " + str(e)}), 500

@app.route('/api/sightings', methods=['GET'])
def get_sightings():
    # Get filter parameters from the URL
    cryptid_id = request.args.get('cryptid_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    min_credibility = request.args.get('min_credibility')

    # Start with a base query
    query = Sighting.query

    # Apply filters if they exist
    if cryptid_id:
        query = query.filter(Sighting.cryptid_id == cryptid_id)
    if start_date:
        query = query.filter(Sighting.date_sighted >= start_date)
    if end_date:
        query = query.filter(Sighting.date_sighted <= end_date)
    if min_credibility:
        query = query.filter(Sighting.credibility_score >= int(min_credibility))

    sightings = query.all()
    
    # Calculate Statistics for the report
    total_sightings = len(sightings)
    avg_credibility = 0
    cryptid_counts = {}
    evidence_counts = {}

    if total_sightings > 0:
        avg_credibility = sum(s.credibility_score for s in sightings) / total_sightings
        
        for s in sightings:
            # Count Cryptid occurrences safely
            cryptid = Cryptid.query.get(s.cryptid_id)
            name = cryptid.name if cryptid else "Unknown Creature"
            cryptid_counts[name] = cryptid_counts.get(name, 0) + 1
            
            # Count Evidence occurrences
            evidence_records = SightingEvidence.query.filter_by(sighting_id=s.id).all()
            for er in evidence_records:
                e_name = EvidenceType.query.get(er.evidence_type_id).name
                evidence_counts[e_name] = evidence_counts.get(e_name, 0) + 1

    # Find the top items
    top_cryptid = max(cryptid_counts, key=cryptid_counts.get) if cryptid_counts else "N/A"
    top_evidence = max(evidence_counts, key=evidence_counts.get) if evidence_counts else "None"
        
    result_list = []
    for s in sightings:
        cryptid = Cryptid.query.get(s.cryptid_id)
        evidence_records = SightingEvidence.query.filter_by(sighting_id=s.id).all()
        
        evidence_names = [EvidenceType.query.get(e.evidence_type_id).name for e in evidence_records]
        evidence_ids = [e.evidence_type_id for e in evidence_records]
        
        result_list.append({
            "id": s.id,
            "cryptid_id": s.cryptid_id,
            "cryptid_name": cryptid.name if cryptid else "Unknown",
            "date_sighted": s.date_sighted,
            "location": s.location,
            "credibility_score": s.credibility_score,
            "evidence_names": evidence_names,
            "evidence_ids": evidence_ids
        })

    return jsonify({
        "sightings": result_list,
        "stats": {
            "count": total_sightings,
            "average_credibility": round(avg_credibility, 2),
            "top_cryptid": top_cryptid,
            "top_evidence": top_evidence
        }
    }), 200

@app.route('/api/sightings/<int:id>', methods=['PUT', 'OPTIONS'])
def update_sighting(id):
    if request.method == 'OPTIONS':
        return jsonify({"message": "Preflight OK"}), 200
        
    sighting = Sighting.query.get(id)
    if not sighting:
        return jsonify({"error": "Sighting not found"}), 404
        
    data = request.json
    
    # Update Main Table
    sighting.cryptid_id = data['cryptid_id']
    sighting.date_sighted = data['date_sighted']
    sighting.location = data['location']
    sighting.credibility_score = data['credibility_score']
    
    # Update Supporting Table (and clear it)
    SightingEvidence.query.filter_by(sighting_id=id).delete()
    
    for ev_id in data.get('evidence_ids', []):
        new_evidence = SightingEvidence(
            sighting_id=id,
            evidence_type_id=ev_id
        )
        db.session.add(new_evidence)
        
    db.session.commit()
    return jsonify({"message": "Sighting updated successfully!"}), 200

@app.route('/api/sightings/<int:id>', methods=['DELETE', 'OPTIONS'])
def delete_sighting(id):
    if request.method == 'OPTIONS':
        return jsonify({"message": "Preflight OK"}), 200
        
    sighting = Sighting.query.get(id)
    if not sighting:
        return jsonify({"error": "Sighting not found"}), 404
        
    db.session.delete(sighting)
    db.session.commit()
    return jsonify({"message": "Sighting deleted successfully!"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
