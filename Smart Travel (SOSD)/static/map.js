  var map = L.map('map', {zoomControl: false}).setView([21.028511, 105.804817], 12); // default location (Hanoi)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  setPlaceMarkers();
  L.control.zoom({position: 'bottomright'}).addTo(map);
  var marker = L.marker([0, 0]);
  var currentLocation = [0,0];
  var currentPlaceId = 0;

var baseIcon = L.Icon.extend({
    options: {
        iconSize: [32, 48],
        iconAnchor: [0, 0],
        popupAnchor: [16, 0]
    }
});

var restaurantIcon = new baseIcon({iconUrl: '../static/restaurant-icon.png'}),
    hotelIcon = new baseIcon({iconUrl: '../static/hotel-icon.png'}),
    attractionIcon = new baseIcon({iconUrl: '../static/attraction-icon.png'});

const hotelGroup      = L.layerGroup();
const restaurantGroup = L.layerGroup();   
const attractionGroup = L.layerGroup();

const overlayMaps = {
    "Hotels"      : hotelGroup,
    "Restaurants" : restaurantGroup,
    "Attractions" : attractionGroup
};

L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);

function fetchJSON(url) {
    return fetch(url).then(r => r.json());
}

function setPlaceMarkers(){
    fetchJSON('./api/places')
        .then(places => {
            console.log('Fetched places:', places);
            places.forEach(place => {
                let icon, group;
                if (place.category === 'Hotel' || place.category === 'Khách sạn') {
                    icon = hotelIcon;
                    group = hotelGroup;
                } else if (place.category === 'Restaurant' || place.category === 'Nhà hàng') {
                    icon = restaurantIcon;
                    group = restaurantGroup;
                } else {
                    icon = attractionIcon;
                    group = attractionGroup;
                }
                const placeMarker = L.marker([place.lat, place.lng], { icon })
                                    .on('click', () => {showPlaceInfo(place.id);});
                group.addLayer(placeMarker);
            });
        });
}

hotelGroup.addTo(map);
restaurantGroup.addTo(map);
attractionGroup.addTo(map);

function goToMarker(result) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lng);
    console.log(`Navigating to: ${result.name} (${lat}, ${lng})`);
    map.setView([lat, lng], 16);
    suggestionsList.innerHTML = '';
    input.value = result.name;
}

const locationInfoPanel = document.getElementById('location-info');
const input = document.getElementById('input');
const suggestionsList = document.getElementById('suggestionsList');
const itineraryPanel = document.getElementById('itinerary-panel'); 

// Stop all events from bubbling to the map
['mousedown', 'mousemove', 'mouseup', 'click', 'touchstart', 'touchmove', 'touchend', 'wheel'].forEach(event => {
    locationInfoPanel.addEventListener(event, (e) => {
        e.stopPropagation();
    });
    input.addEventListener(event, (e) => {
        e.stopPropagation();
    });
    suggestionsList.addEventListener(event, (e) => {
        e.stopPropagation();
    });
    itineraryPanel.addEventListener(event, (e) => {
        e.stopPropagation();
    });
});

async function showPlaceInfo(placeId) {
    fetchJSON(`./api/places/${placeId}`)
        .then(places => {
            const place = places[0];
            console.log("place info: " + JSON.stringify(place))
            document.getElementById('place-name').innerHTML = place.name;
            document.getElementById('place-category').innerHTML = place.category;
            document.getElementById('place-price').innerHTML = place.price ?? '—';
            document.getElementById('place-rating').innerHTML = place.rating ?? '—';
            document.getElementById('place-hours').innerHTML = place.opening_hours ?? '—';

            const statusIndicator = document.querySelector('#confirm-status span');
            if (place.confirmed === "1") {
                statusIndicator.innerHTML = 'Confirmed';
                statusIndicator.style.color = 'green';
            } else {
                statusIndicator.innerHTML = 'Not confirmed (admin review pending)';
                statusIndicator.style.color = 'orange';
            }

            fetchJSON(`/weather/current?lat=${place.lat}&lng=${place.lng}`)
            .then(weather => {
                document.getElementById('weather-current').innerHTML = `
                    <p><strong>Temp:</strong> ${weather.current.temperature}°C</p>
                    <p><strong>Condition:</strong> ${weather.current.weathercode}</p>
                    <p><strong>Wind:</strong> ${weather.current.windspeed} m/s</p>
                `;
                
                const forecastHTML = weather.forecast_5day.time.map((date, index) => `
                    <div class="forecast-item">
                        <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
                        <p><strong>Temperature:</strong> ${weather.forecast_5day.temperature_2m_min[index]}-${weather.forecast_5day.temperature_2m_max[index]}°C</p>
                        <p><strong>Weather:</strong> ${weather.forecast_5day.weather_code[index]}</p>
                        <p><strong>Precipitation:</strong> ${weather.forecast_5day.precipitation_sum[index]} mm</p>
                    </div>
                `).join('');
                document.getElementById('weather-forecast').innerHTML = forecastHTML;
            });
            
            loadReviews(placeId, 1);
            
            fetch(`./api/reverse?lat=${place.lat}&lng=${place.lng}`)
                .then(r => r.text())
                .then(address => {
                    document.getElementById('place-address').innerHTML = address;
                });
            goToMarker(place);

            currentLocation = [place.lat, place.lng]
            currentPlaceId = place.id

            const itinerarySection = document.getElementById('itinerary-section');
            if (itinerarySection) {
                const btn = itinerarySection.querySelector('#add-to-itinerary');
                btn.onclick = () => {
                    if (itinerary.addLocation(place)) {
                        if (itineraryVisible === false)
                            toggleItineraryPanel();
                        renderItineraryList();
                        drawRoute();
                        btn.textContent = '✓ Added to Route';
                        btn.disabled = true;
                        setTimeout(() => {
                            btn.textContent = '+ Add to Route';
                            btn.disabled = false;
                        }, 2000);
                    }
                };
            }

            // Show panel
            document.getElementById('location-info').classList.remove('hidden');
            })
};

// Close button
document.getElementById('close-info').addEventListener('click', () => {
    document.getElementById('location-info').classList.add('hidden');
});

let timeout;
let selectedIndex = -1;

input.addEventListener('input', () => {
    clearTimeout(timeout);
    const q = input.value.trim();
    suggestionsList.innerHTML = '';
    selectedIndex = -1;
    if (!q) return;
    timeout = setTimeout(() => {
        fetch(`./api/autocomplete?q=${q}`)
            .then(r => r.json())
            .then(results => {
                const center = map.getCenter();
                results.sort((a, b) => {
                    const distA = Math.pow(a.lat - center.lat, 2) + Math.pow(a.lng - center.lng, 2);
                    const distB = Math.pow(b.lat - center.lat, 2) + Math.pow(b.lng - center.lng, 2);
                    return distA - distB;
                });
                suggestionsList.innerHTML = '';
                console.log("Data received: " + results)
                results.slice(0, 5).forEach((result, idx) => {
                    const li = document.createElement('li');
                    li.textContent = result.name;
                    li.style.cssText = `padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;`;
                    li.addEventListener('mouseover', () => { li.style.background = '#f0f0f0'; });
                    li.addEventListener('mouseout', () => { li.style.background = 'white'; });
                    li.addEventListener('click', () => showPlaceInfo(result.id));
                    suggestionsList.appendChild(li);
                });
            });
    }, 300);
});

input.addEventListener('keydown', (e) => {
    const items = suggestionsList.querySelectorAll('li');
    if (e.key === 'ArrowDown') {
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        items.forEach(li => li.style.background = 'white');
        if (items[selectedIndex]) items[selectedIndex].style.background = '#f0f0f0';
    } else if (e.key === 'ArrowUp') {
        selectedIndex = Math.max(selectedIndex - 1, -1);
        items.forEach(li => li.style.background = 'white');
        if (items[selectedIndex]) items[selectedIndex].style.background = '#f0f0f0';
    } else if (e.key === 'Enter' && selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        const result = JSON.parse(items[selectedIndex].dataset.result || '{}');
        showPlaceInfo(result.id);
    }
});

document.addEventListener('click', e => {
    // if the click is NOT on the input or the suggestion list, clear it
    if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.innerHTML = '';
        selectedIndex = -1;
    }
});

map.on('contextmenu', function(e) {
    const { lat, lng } = e.latlng;
    marker.setLatLng([lat, lng]).addTo(map);
    
    showAddPlaceModal(lat, lng);
});

function showAddPlaceModal(lat, lng) {
    const form = document.createElement('div');
    form.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h3>Add Missing Place</h3>
                <p>All fields marked with "*" are required.</p>
                <p>Latitude: ${lat.toFixed(4)}, Longitude: ${lng.toFixed(4)}</p>
                <label for="place-name-input">Place name *</label><br>
                <input type="text" id="place-name-input" name="place-name-input" /> <br>
                <label> Place Category * </label> <br>
                <select id="place-category-input">
                    <option value="">Select category</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Attraction">Attraction</option>
                </select> <br>
                <label for="place-price-input">Price</label><br>
                <input type="text" id="place-price-input" name="place-price-input" /> <br>
                <label for="place-opening-input">Opening Hours</label><br>
                <input type="text" id="place-opening-input" name="place-opening-input" /> <br>
                <div class="modal-buttons">
                    <button id="submit-place">Submit</button>
                    <button id="cancel-place">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(form);
    
    document.getElementById('submit-place').addEventListener('click', async () => {
        const name = document.getElementById('place-name-input').value.trim();
        const category = document.getElementById('place-category-input').value;
        const price = document.getElementById('place-price-input').value.trim();
        const openingHours = document.getElementById('place-opening-input').value.trim();
        
        if (!name || !category) {
            alert('Please fill in all required fields');
            return;
        }
        
        await addMissingPlace(lat, lng, name, category, price, openingHours);
        form.remove();
    });
    
    document.getElementById('cancel-place').addEventListener('click', () => {
        marker.remove();
        form.remove();
    });
}

async function addMissingPlace(lat, lng, name, category, price, openingHours) {
    try {
        const response = await fetch('./api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category, lat, lng, price, openingHours })
        });
        
        if (response.ok) {
            alert('Place submitted! Awaiting admin confirmation.');
            marker.remove();
        } else {
            alert('Error submitting place.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting place.');
    }
}
