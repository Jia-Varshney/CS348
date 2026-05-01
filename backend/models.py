# models.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# --- LOOKUP TABLES ---
class Cryptid(db.Model):
    __tablename__ = 'cryptids'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) 
    
class EvidenceType(db.Model):
    __tablename__ = 'evidence_types'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) 

# --- MAIN TABLE ---
class Sighting(db.Model):
    __tablename__ = 'sightings'
    id = db.Column(db.Integer, primary_key=True)
    cryptid_id = db.Column(db.Integer, db.ForeignKey('cryptids.id'), index=True, nullable=False)
    date_sighted = db.Column(db.String(50), index=True, nullable=False) # Changed to String!
    location = db.Column(db.String(200), nullable=False)
    credibility_score = db.Column(db.Integer, index=True, nullable=False) 
    
    evidence = db.relationship('SightingEvidence', backref='sighting', cascade="all, delete-orphan")

# --- EVIDENCE TABLE ---
class SightingEvidence(db.Model):
    __tablename__ = 'sighting_evidence'
    id = db.Column(db.Integer, primary_key=True)
    sighting_id = db.Column(db.Integer, db.ForeignKey('sightings.id'), nullable=False)
    evidence_type_id = db.Column(db.Integer, db.ForeignKey('evidence_types.id'), nullable=False)