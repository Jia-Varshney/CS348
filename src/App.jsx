import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('report'); 
  const [formData, setFormData] = useState({ cryptids: [], evidenceTypes: [] });
  const [sightingsList, setSightingsList] = useState([]);
  
  // Track if we are editing an existing sighting
  const [editId, setEditId] = useState(null);
  
  const [sighting, setSighting] = useState({
    cryptid_id: '',
    new_cryptid_name: '',
    date_sighted: '',
    location: '',
    credibility_score: 5,
    evidence_ids: []
  });

  const [filters, setFilters] = useState({
    cryptid_id: '',
    start_date: '',
    end_date: '',
    min_credibility: 0
  });
  const [stats, setStats] = useState({ count: 0, average_credibility: 0 });

  useEffect(() => {
    fetchFormData();
    fetchSightings();
  }, []);

  const fetchFormData = () => {
    fetch('http://127.0.0.1:5000/api/form-data')
      .then(res => res.json())
      .then(data => setFormData({ cryptids: data.cryptids, evidenceTypes: data.evidence_types }))
      .catch(err => console.error("Error fetching form data:", err));
  };

  const fetchSightings = () => {
    const queryParams = new URLSearchParams(filters).toString();
    fetch(`http://127.0.0.1:5000/api/sightings?${queryParams}`)
      .then(res => res.json())
      .then(data => {
        setSightingsList(data.sightings);
        setStats(data.stats);
      })
      .catch(err => console.error("Error fetching sightings:", err));
  };

  // Re-fetch whenever filters change
  useEffect(() => {
    fetchSightings();
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      cryptid_id: '',
      start_date: '',
      end_date: '',
      min_credibility: 0
    });
  };

  // Fill the form with existing data when Edit is clicked
  const handleEditClick = (s) => {
    setEditId(s.id);
    setSighting({
      cryptid_id: s.cryptid_id,
      new_cryptid_name: '',
      date_sighted: s.date_sighted,
      location: s.location,
      credibility_score: s.credibility_score,
      evidence_ids: s.evidence_ids
    });
    setActiveTab('report'); // Switch to the form tab
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setSighting({ cryptid_id: '', new_cryptid_name: '', date_sighted: '', location: '', credibility_score: 5, evidence_ids: [] });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    fetch(`http://127.0.0.1:5000/api/sightings/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        alert("🗑️ " + data.message);
        fetchSightings();
      })
      .catch(err => console.error("Error deleting sighting:", err));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSighting(prev => ({ ...prev, [name]: value }));
  };

  const handleEvidenceChange = (e) => {
    const value = parseInt(e.target.value);
    setSighting(prev => {
      const newEvidence = e.target.checked 
        ? [...prev.evidence_ids, value]
        : prev.evidence_ids.filter(id => id !== value);
      return { ...prev, evidence_ids: newEvidence };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const url = editId 
      ? `http://127.0.0.1:5000/api/sightings/${editId}`
      : 'http://127.0.0.1:5000/api/sightings';
      
    const method = editId ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sighting,
        cryptid_id: sighting.cryptid_id === 'new' ? 'new' : parseInt(sighting.cryptid_id),
        credibility_score: parseInt(sighting.credibility_score)
      })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request.");
      }
      return data;
    })
    .then(data => {
      alert("🛸 " + data.message);
      handleCancelEdit(); 
      fetchSightings();
      fetchFormData(); // Refetches dropdown menu
    })
    .catch(err => {
      alert("❌ " + err.message);
      console.error("Error processing sighting:", err);
    });
  };

  return (
    <div className="container">
      <header>
        <h1>🛸 The Cryptid Tracker</h1>
        <nav style={{ marginBottom: '20px' }}>
          <button onClick={() => setActiveTab('report')} style={{ marginRight: '10px' }}>Log a Sighting</button>
          <button onClick={() => setActiveTab('analytics')}>Sighting Database</button>
        </nav>
      </header>

      <main>
        {activeTab === 'report' && (
          <section>
            <h2>{editId ? "✏️ Edit Sighting" : "Log a New Sighting"}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', margin: '0 auto' }}>
              <div>
                <label><strong>Which Cryptid?</strong></label><br/>
                <select name="cryptid_id" value={sighting.cryptid_id} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}>
                  <option value="">-- Select a Creature --</option>
                  {formData.cryptids.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="new">OTHER (Add New Cryptid)</option>
                </select>

                {sighting.cryptid_id === 'new' && ( // pops up when you hit enter new cryptid
                  <div style={{ marginTop: '10px' }}>
                    <label><strong>New Cryptid:</strong></label><br/>
                    <input type="text" name="new_cryptid_name" value={sighting.new_cryptid_name} onChange={handleChange} required placeholder="e.g., Chupacabra" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>

              <div>
                <label><strong>Date Sighted:</strong></label><br/>
                <input type="date" name="date_sighted" value={sighting.date_sighted} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label><strong>Location:</strong></label><br/>
                <input type="text" name="location" value={sighting.location} onChange={handleChange} required placeholder="e.g., Point Pleasant, WV" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label><strong>Credibility Score ({sighting.credibility_score}/10):</strong></label><br/>
                <input type="range" name="credibility_score" min="1" max="10" value={sighting.credibility_score} onChange={handleChange} style={{ width: '100%' }} />
              </div>

              <div style={{ textAlign: 'left', border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
                <label><strong>Submitted Evidence:</strong></label><br/>
                {formData.evidenceTypes.map(e => (
                  <div key={e.id}>
                    <label>
                      <input type="checkbox" value={e.id} onChange={handleEvidenceChange} checked={sighting.evidence_ids.includes(e.id)} /> {e.name}
                    </label>
                  </div>
                ))}
              </div>

              <button type="submit" style={{ padding: '10px', backgroundColor: editId ? '#FF9800' : '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>
                {editId ? "Save Changes" : "Submit Sighting"}
              </button>

              {editId && (
                <button type="button" onClick={handleCancelEdit} style={{ padding: '10px', backgroundColor: '#9e9e9e', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>
                  Cancel Edit
                </button>
              )}
            </form>
          </section>
        )}

        {activeTab === 'analytics' && (
          <section>
            <h2>Cryptid Intelligence Report</h2>
            
            {/* --- FILTER BAR --- */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', padding: '15px', background: '#129cbb', borderRadius: '8px', alignItems: 'center' }}>
              <select value={filters.cryptid_id} onChange={(e) => setFilters({...filters, cryptid_id: e.target.value})}>
                <option value="">All Cryptids</option>
                {formData.cryptids.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <input type="date" value={filters.start_date} onChange={(e) => setFilters({...filters, start_date: e.target.value})} />
              <input type="date" value={filters.end_date} onChange={(e) => setFilters({...filters, end_date: e.target.value})} />
              
              <label>Min Credibility: 
                <input type="number" value={filters.min_credibility} min="0" max="10" style={{width: '50px', marginLeft: '5px'}} onChange={(e) => setFilters({...filters, min_credibility: e.target.value})} />
              </label>

              <button onClick={handleResetFilters} style={{ backgroundColor: '#607d8b', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Clear Filters
              </button>
            </div>

            {/* --- STATISTICS SUMMARY --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px', textAlign: 'center', backgroundColor: '#2c3e50', color: 'white', padding: '15px', borderRadius: '8px' }}>
              <div><small>Total Records</small><br/><strong>{stats.count}</strong></div>
              <div><small>Avg. Credibility</small><br/><strong>{stats.average_credibility}/10</strong></div>
              <div><small>Most Spotted</small><br/><strong>{stats.top_cryptid}</strong></div>
              <div><small>Top Evidence</small><br/><strong>{stats.top_evidence}</strong></div>
            </div>

            {/* --- RESULTS TABLE --- */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#129cbb' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Cryptid</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Date</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Location</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Score</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sightingsList.map(s => (
                  <tr key={s.id}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{s.cryptid_name}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{s.date_sighted}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{s.location}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{s.credibility_score}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      <button onClick={() => handleEditClick(s)}>Edit</button>
                      <button onClick={() => handleDelete(s.id)} style={{marginLeft: '5px', backgroundColor: 'red', color: 'white'}}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  )
}

export default App