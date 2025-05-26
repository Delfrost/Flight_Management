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

# Update the available_flights list first
available_flights = [
    {
        "flight_number": "FL01",
        "departure": "New York",
        "destination": "London",
        "departure_time": "10:00",
        "status": "On Time",
        "gate": "A1",
        "aircraft": "Boeing 777-300ER"
    },
    {
        "flight_number": "FL02",
        "departure": "London",
        "destination": "Paris",
        "departure_time": "14:30",
        "status": "On Time",
        "gate": "B3",
        "aircraft": "Airbus A320neo"
    },
    {
        "flight_number": "FL03",
        "departure": "Paris",
        "destination": "Dubai",
        "departure_time": "18:45",
        "status": "On Time",
        "gate": "C2",
        "aircraft": "Boeing 787-9"
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

@app.route('/api/check-in', methods=['POST', 'OPTIONS'])
def check_in():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        data = request.get_json()
        logger.info(f"Received check-in data: {data}")
        
        if not data:
            logger.error("No JSON data received in request")
            return jsonify({
                "error": "No data provided",
                "available_flights": [
                    {
                        "value": f["flight_number"],
                        "label": f"{f['flight_number']} - {f['departure']} to {f['destination']}"
                    } for f in available_flights
                ]
            }), 400

        # Map numeric flight numbers to FL format
        flight_number = data.get("flightNumber")
        if flight_number in ['0', '1', '2', '3']:
            mapped_flight_number = f"FL0{int(flight_number) + 1}"
            data["flightNumber"] = mapped_flight_number
            logger.info(f"Mapped flight number {flight_number} to {mapped_flight_number}")

        # Validate all required fields
        required_fields = {
            "name": str,
            "age": str,
            "contact": str,
            "seatPreference": str,
            "flightNumber": str
        }

        for field, field_type in required_fields.items():
            if field not in data or not isinstance(data[field], field_type):
                return jsonify({
                    "error": f"Invalid or missing {field}",
                    "available_flights": [
                        {
                            "value": f["flight_number"],
                            "label": f"{f['flight_number']} - {f['departure']} to {f['destination']}"
                        } for f in available_flights
                    ]
                }), 400

        # Validate against available flights
        valid_flight_numbers = [f["flight_number"] for f in available_flights]
        if data["flightNumber"] not in valid_flight_numbers:
            return jsonify({
                "error": "Invalid flight number",
                "message": f"Please select from available flights: {', '.join(valid_flight_numbers)}",
                "available_flights": [
                    {
                        "value": f["flight_number"],
                        "label": f"{f['flight_number']} - {f['departure']} to {f['destination']}"
                    } for f in available_flights
                ]
            }), 400

        # Find flight info
        flight_info = next((f for f in available_flights if f["flight_number"] == data["flightNumber"]), None)
        if not flight_info:
            return jsonify({"error": "Flight not found"}), 404

        # Create passenger record with boarding pass number
        global passenger_counter
        passenger_counter += 1
        boarding_pass = f"BP{flight_info['flight_number']}-{passenger_counter:04d}"
        
        passengers[passenger_counter] = {
            "passenger_id": passenger_counter,
            "boarding_pass": boarding_pass,
            "name": data["name"],
            "flight_number": data["flightNumber"],
            "seat": data["seatPreference"],
            "contact": data["contact"],
            "boarding_time": datetime.now().strftime("%H:%M"),
            "boarding_group": "C",
            "checked_bags": 0,
            "boarding_status": "pending",
            "gate": flight_info["gate"],
            "aircraft": flight_info["aircraft"],
            "age": data["age"]
        }
        
        logger.info(f"New passenger checked in: {passengers[passenger_counter]}")
        
        # Return detailed response with passenger and flight information
        return jsonify({
            "success": True,
            "passenger_id": passenger_counter,
            "boarding_pass": boarding_pass,
            "passenger_details": passengers[passenger_counter],
            "flight_details": flight_info
        })

    except Exception as e:
        logger.error(f"Check-in error: {str(e)}")
        return jsonify({"error": str(e)}), 500

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
    
    # Format all flights with complete details
    all_flights = []
    
    # Add available (unbooked) flights
    for flight in available_flights:
        flight_data = {
            "id": flight["flight_number"],  # For internal use
            "flight_number": flight["flight_number"],  # Display value (FL01, FL02, etc.)
            "departure": flight["departure"],
            "destination": flight["destination"],
            "departure_time": flight["departure_time"],
            "status": flight["status"],
            "gate": flight["gate"],
            "aircraft": flight["aircraft"],
            "value": flight["flight_number"],  # For select/dropdown value
            "label": f"{flight['flight_number']} - {flight['departure']} to {flight['destination']}"  # For select/dropdown display
        }
        
        if flight["flight_number"] not in booked_flights:
            all_flights.append(flight_data)
    
    # Add booked flights with full details
    for flight_num in booked_flights:
        flight_info = next((f for f in available_flights if f["flight_number"] == flight_num), None)
        if flight_info:
            all_flights.append({
                "id": flight_info["flight_number"],
                "flight_number": flight_info["flight_number"],
                "departure": flight_info["departure"],
                "destination": flight_info["destination"],
                "departure_time": flight_info["departure_time"],
                "status": "Boarding",
                "gate": flight_info["gate"],
                "aircraft": flight_info["aircraft"],
                "value": flight_info["flight_number"],
                "label": f"{flight_info['flight_number']} - {flight_info['departure']} to {flight_info['destination']}"
            })
    
    return jsonify({
        "flights": all_flights,
        "available_flight_numbers": [
            {
                "value": f["flight_number"],
                "label": f"{f['flight_number']} - {f['departure']} to {f['destination']}"
            } for f in available_flights
        ]
    })

# Add a new endpoint for boarding pass
@app.route('/api/boarding-pass/<int:passenger_id>')
def get_boarding_pass(passenger_id):
    if passenger_id not in passengers:
        return jsonify({"error": "Passenger not found"}), 404
        
    passenger = passengers[passenger_id]
    flight_info = next((f for f in available_flights 
                       if f["flight_number"] == passenger["flight_number"]), None)
    
    if not flight_info:
        return jsonify({"error": "Flight not found"}), 404
        
    return jsonify({
        "passenger": passenger,
        "flight": flight_info,
        "boarding_pass": passenger.get("boarding_pass"),
        "gate": passenger.get("gate"),
        "boarding_time": passenger.get("boarding_time"),
        "boarding_group": passenger.get("boarding_group")
    })

if __name__ == '__main__':
    try:
        print("Starting Flight Management Server...")
        socketio.run(app, 
                    host='0.0.0.0',
                    port=5000,
                    debug=True,
                    allow_unsafe_werkzeug=True)
    except Exception as e:
        print(f"Error starting server: {e}")