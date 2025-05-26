from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import heapq 
from datetime import datetime, timedelta  
import uuid
import logging
import os

app = Flask(__name__)
app.secret_key = 'your_secret_key'  
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
socketio = SocketIO(app, 
                   cors_allowed_origins=["http://localhost:3000"],
                   async_mode='threading')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data storage
passengers = {}
boarding_queue = []
passenger_counter = 0

# Add default flights
available_flights = [
    {
        "flight_number": "FL101",
        "departure": "New York",
        "destination": "London",
        "departure_time": "10:00",
        "status": "On Time"
    },
    {
        "flight_number": "FL102",
        "departure": "London",
        "destination": "Paris",
        "departure_time": "14:30",
        "status": "On Time"
    },
    {
        "flight_number": "FL103",
        "departure": "Paris",
        "destination": "Dubai",
        "departure_time": "18:45",
        "status": "On Time"
    }
]

# Serve React App in production
@app.route('/')
def index():
    if app.debug:
        return render_template('index.html')
    return send_from_directory('../frontend/build', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if app.debug:
        return send_from_directory('static', path)
    return send_from_directory('../frontend/build', path)

@app.route('/check-in', methods=["POST"])
def check_in():
    global passenger_counter
    data = request.json
    passenger_counter += 1
    passengers[passenger_counter] = {
        "name": data["name"],
        "flight_number": data["flight_number"],
        "seat": data["seat"],
        "contact": data["contact"],
        "boarding_time": data["boarding_time"],
        "boarding_group": data.get("boarding_group", "C"),  # Default group
        "checked_bags": data.get("checked_bags", 0),
        "boarding_status": "pending"
    }
    logger.info(f"New passenger checked in: {passengers[passenger_counter]}")

    # Emit a boarding queue update to all clients
    queue_for_emit = [(group, time.strftime("%H:%M"), passenger_id) 
                      for group, time, passenger_id in boarding_queue]
    socketio.emit('boarding_update', {
        'queue': queue_for_emit, 
        'passengers': passengers
    })

    return jsonify({"success": True, "passenger_id": passenger_counter})

@app.route('/flight/<int:passenger_id>')
def flight_details(passenger_id):
    if passenger_id not in passengers:
        return jsonify({"error": "Passenger not found"}), 404
    return jsonify(passengers[passenger_id])

@app.route('/boarding/<int:passenger_id>')
def boarding_status(passenger_id):
    if passenger_id not in passengers:
        return jsonify({"error": "Passenger not found"}), 404
    
    passenger = passengers[passenger_id]
    queue_position = next((i for i, (_, _, pid) in enumerate(boarding_queue) 
                          if pid == passenger_id), None)
    
    return jsonify({
        "passenger": passenger,
        "queue_position": queue_position,
        "boarding_status": passenger["boarding_status"]
    })

@app.route('/start-boarding', methods=["POST"])
def start_boarding():
    flight_number = request.json["flight_number"]
    # Add passengers to boarding queue based on boarding groups
    for passenger_id, passenger in passengers.items():
        if passenger["flight_number"] == flight_number:
            heapq.heappush(boarding_queue, (
                passenger["boarding_group"],
                datetime.strptime(passenger["boarding_time"], "%H:%M"),
                passenger_id
            ))
    
    emit_boarding_update()
    return jsonify({"success": True})

def emit_boarding_update():
    """Helper function to emit boarding updates to all clients."""
    queue_for_emit = [(group, time.strftime("%H:%M"), passenger_id) 
                      for group, time, passenger_id in boarding_queue]
    socketio.emit('boarding_update', {
        'queue': queue_for_emit, 
        'passengers': passengers
    })

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    # Send current queue state to newly connected client
    queue_for_emit = [(group, time.strftime("%H:%M"), passenger_id) for group, time, passenger_id in boarding_queue]
    emit('boarding_update', {'queue': queue_for_emit, 'passengers': passengers})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('join_queue')
def handle_join_queue(data):
    passenger_id = data.get('passenger_id')
    if passenger_id:
        join_room(f'passenger_{passenger_id}')
        print(f'Passenger {passenger_id} joined their queue room')

@socketio.on('leave_queue')
def handle_leave_queue(data):
    passenger_id = data.get('passenger_id')
    if passenger_id:
        leave_room(f'passenger_{passenger_id}')
        print(f'Passenger {passenger_id} left their queue room')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                             'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/manifest.json')
def manifest():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                             'manifest.json', mimetype='application/json')

@app.route('/api/flights', methods=['GET'])
def get_flights():
    # Return both available flights and flights with checked-in passengers
    booked_flights = set(passenger.get("flight_number") for passenger in passengers.values())
    all_flights = [
        flight for flight in available_flights
        if flight["flight_number"] not in booked_flights
    ] + [
        {"flight_number": flight_num, "status": "Boarding"} 
        for flight_num in booked_flights
    ]
    
    return jsonify({"flights": all_flights})

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)