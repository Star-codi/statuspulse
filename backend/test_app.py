import pytest
import json
from app import app, db, Service, Incident

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            # Seed a service
            db.session.add(Service(name='Test Service'))
            db.session.commit()
        yield client

def test_health(client):
    res = client.get('/health')
    assert res.status_code == 200
    assert res.get_json()['status'] == 'ok'

def test_get_services(client):
    res = client.get('/api/services')
    assert res.status_code == 200
    data = res.get_json()
    assert len(data) == 1
    assert data[0]['name'] == 'Test Service'

def test_create_service(client):
    res = client.post('/api/services',
        data=json.dumps({'name': 'New Service'}),
        content_type='application/json')
    assert res.status_code == 201
    assert res.get_json()['name'] == 'New Service'

def test_create_incident(client):
    res = client.post('/api/incidents',
        data=json.dumps({
            'service_id': 1,
            'title': 'DB connection spike',
            'severity': 'major'
        }),
        content_type='application/json')
    assert res.status_code == 201

def test_get_incidents(client):
    res = client.get('/api/incidents')
    assert res.status_code == 200
    assert isinstance(res.get_json(), list)

def test_service_status_updates_on_critical_incident(client):
    client.post('/api/incidents',
        data=json.dumps({
            'service_id': 1,
            'title': 'Total outage',
            'severity': 'critical'
        }),
        content_type='application/json')
    res = client.get('/api/services')
    svc = res.get_json()[0]
    assert svc['status'] == 'down'
