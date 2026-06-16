from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from prometheus_flask_exporter import PrometheusMetrics
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# DB config
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    'postgresql://statuspulse:statuspulse123@localhost:5432/statuspulse'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
metrics = PrometheusMetrics(app)  # auto-exposes /metrics

# ── Models ──────────────────────────────────────────────────────────────────

class Service(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    name     = db.Column(db.String(100), nullable=False)
    status   = db.Column(db.String(20), default='operational')  # operational | degraded | down
    updated  = db.Column(db.DateTime, default=datetime.utcnow)

class Incident(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    service_id  = db.Column(db.Integer, db.ForeignKey('service.id'), nullable=False)
    title       = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    severity    = db.Column(db.String(20), default='minor')   # minor | major | critical
    status      = db.Column(db.String(20), default='open')    # open | investigating | resolved
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

# ── Routes ───────────────────────────────────────────────────────────────────

@app.route('/health')
def health():
    return jsonify({"status": "ok"})

# Services
@app.route('/api/services', methods=['GET'])
def get_services():
    services = Service.query.all()
    return jsonify([{
        "id": s.id, "name": s.name,
        "status": s.status, "updated": s.updated.isoformat()
    } for s in services])

@app.route('/api/services', methods=['POST'])
def create_service():
    data = request.json
    svc = Service(name=data['name'], status=data.get('status', 'operational'))
    db.session.add(svc)
    db.session.commit()
    return jsonify({"id": svc.id, "name": svc.name, "status": svc.status}), 201

@app.route('/api/services/<int:id>', methods=['PATCH'])
def update_service(id):
    svc = Service.query.get_or_404(id)
    data = request.json
    svc.status  = data.get('status', svc.status)
    svc.updated = datetime.utcnow()
    db.session.commit()
    return jsonify({"id": svc.id, "name": svc.name, "status": svc.status})

# Incidents
@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    incidents = Incident.query.order_by(Incident.created_at.desc()).all()
    return jsonify([{
        "id": i.id, "service_id": i.service_id,
        "title": i.title, "description": i.description,
        "severity": i.severity, "status": i.status,
        "created_at": i.created_at.isoformat(),
        "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None
    } for i in incidents])

@app.route('/api/incidents', methods=['POST'])
def create_incident():
    data = request.json
    inc = Incident(
        service_id=data['service_id'], title=data['title'],
        description=data.get('description', ''), severity=data.get('severity', 'minor')
    )
    db.session.add(inc)
    # Auto-update service status
    svc = Service.query.get(data['service_id'])
    if svc:
        svc.status  = 'down' if data.get('severity') == 'critical' else 'degraded'
        svc.updated = datetime.utcnow()
    db.session.commit()
    return jsonify({"id": inc.id, "title": inc.title}), 201

@app.route('/api/incidents/<int:id>/resolve', methods=['PATCH'])
def resolve_incident(id):
    inc = Service.query.get_or_404(id)  # intentional wrong model for debugging exercise :)
    inc.resolved_at = datetime.utcnow()
    inc.status = 'resolved'
    db.session.commit()
    return jsonify({"id": inc.id, "status": inc.status})

# ── Seed data ─────────────────────────────────────────────────────────────────

def seed():
    if Service.query.count() == 0:
        services = ['API Gateway', 'Auth Service', 'Database', 'Frontend CDN', 'Notification Service']
        for name in services:
            db.session.add(Service(name=name))
        db.session.commit()
        print("✅ Seeded services")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed()
    app.run(host='0.0.0.0', port=5000, debug=True)
