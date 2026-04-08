  var map = L.map('map', {zoomControl: false}).setView([21.028511, 105.804817], 12); // default location (Hanoi)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  L.control.zoom({position: 'bottomright'}).addTo(map);
  var marker = L.marker([0, 0]);
  var currentLocation = [0,0];
  var currentPlaceId = 0;
  const filterState = {
    city: "",
    price_min: null,
    price_max: null,
    rating: null,
    category: null,
};

const markerGroup = L.layerGroup().addTo(map);

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

function fetchJSON(url) {
    return fetch(url).then(r => r.json());
}

function formatVNDPrice(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 'Chưa có';
    return n.toLocaleString('vi-VN') + ' VNĐ';
}

function setPlaceMarkers() {
    const params = new URLSearchParams();
    if (filterState){
        if (filterState.city) params.append("city", filterState.city);
        if (filterState.price_min !== null) params.append("price_min", filterState.price_min);
        if (filterState.price_max !== null) params.append("price_max", filterState.price_max);
        if (filterState.rating !== null) params.append("rating", filterState.rating);
        if (filterState.category) params.append("category", filterState.category);
    }
    
    const url = `/search/api/filter?${params.toString()}`;
    
    fetchJSON(url)
        .then(places => {
            markerGroup.clearLayers();
            console.log('Fetched places:', places);
            places.forEach(place => {
                let icon;
                if (place.category === 'Hotel' || place.category === 'Khách sạn') {
                    icon = hotelIcon;

                } else if (place.category === 'Restaurant' || place.category === 'Nhà hàng') {
                    icon = restaurantIcon;

                } else {
                    icon = attractionIcon;

                }
                const placeMarker = L.marker([place.lat, place.lng], { icon })
                    .on('click', () => {showPlaceInfo(place.id);});
                markerGroup.addLayer(placeMarker);
            });
        })
        .catch(err => console.error('Error fetching places:', err));
}

// Apply filters when user changes them
function applyFilters() {
    setPlaceMarkers();
}

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
const filterPanel = document.getElementById('filter-panel');

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
    filterPanel.addEventListener(event, (e) => {
        e.stopPropagation();
    });
});

async function showPlaceInfo(placeId) {
    fetchJSON(`/map/api/places/${placeId}`)
        .then(places => {
            const place = places[0];
            console.log("place info: " + JSON.stringify(place))
            document.getElementById('place-name').innerHTML = place.name;
            document.getElementById('place-category').innerHTML = place.category;
            document.getElementById('place-price').innerHTML = formatVNDPrice(place.price);
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
                    <p><strong>Nhiệt độ:</strong> ${weather.current.temperature}°C</p>
                    <p><strong>Điều kiện thời tiết:</strong> ${weather.current.weathercode}</p>
                    <p><strong>Gió:</strong> ${weather.current.windspeed} m/s</p>
                `;
                
                const forecastHTML = weather.forecast_5day.time.map((date, index) => `
                    <div class="forecast-item">
                        <p><strong>Ngày:</strong> ${new Date(date).toLocaleDateString()}</p>
                        <p><strong>Nhiệt độ:</strong> ${weather.forecast_5day.temperature_2m_min[index]}-${weather.forecast_5day.temperature_2m_max[index]}°C</p>
                        <p><strong>Thời tiết:</strong> ${weather.forecast_5day.weather_code[index]}</p>
                        <p><strong>Mưa:</strong> ${weather.forecast_5day.precipitation_sum[index]} mm</p>
                    </div>
                `).join('');
                document.getElementById('weather-forecast').innerHTML = forecastHTML;
            });
            
            loadReviews(placeId, 1);
            
            fetch(`/map/api/reverse?lat=${place.lat}&lng=${place.lng}`)
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
                        btn.textContent = '✓ Đã thêm vào hành trình';
                        btn.disabled = true;
                        setTimeout(() => {
                            btn.textContent = '+ Thêm vào hành trình';
                            btn.disabled = false;
                        }, 2000);
                    }
                };
            }

            const bookingSection = document.getElementById('booking-section');
            const bookingBtn = document.getElementById('book-place');
            const category = String(place.category || '').trim().toLowerCase();
            const isHotel = category === 'hotel' || category === 'khách sạn';
            if (bookingSection && bookingBtn) {
                if (isHotel) {
                    bookingSection.style.display = 'block';
                    bookingBtn.onclick = () => {
                        const params = new URLSearchParams({
                            place_id: String(place.id),
                            place_name: String(place.name || '')
                        });
                        window.location.href = `/booking/?${params.toString()}`;
                    };
                } else {
                    bookingSection.style.display = 'none';
                    bookingBtn.onclick = null;
                }
            }

            // Show panel
            document.getElementById('location-info').classList.remove('hidden');
            })
};

// Close button
document.getElementById('close-info').addEventListener('click', () => {
    document.getElementById('location-info').classList.add('hidden');
});

const toggleFiltersBtn = document.getElementById('toggle-filters');
const closeFiltersBtn = document.getElementById('close-filters');
const clearFiltersBtn = document.getElementById('clear-filters');

toggleFiltersBtn.addEventListener('click', () => {
    filterPanel.classList.toggle('open');
});

closeFiltersBtn.addEventListener('click', () => {
    filterPanel.classList.remove('open');
});
clearFiltersBtn.addEventListener('click', () => {
    filterState.price_min = null;
    filterState.price_max = null;
    filterState.rating = null;
    filterState.category = null;
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    document.getElementById('rating').value = '';
    document.getElementById('category').value = '';
    applyFilters();
});

// Close filter panel when clicking outside of it
document.addEventListener('click', (e) => {
    if (!filterPanel.contains(e.target) && !toggleFiltersBtn.contains(e.target)) {
        filterPanel.classList.remove('open');
    }
});

// ==== Search functionality ====

let timeout;
let selectedIndex = -1;

input.addEventListener('input', () => {
    clearTimeout(timeout);
    const q = input.value.trim();
    suggestionsList.innerHTML = '';
    selectedIndex = -1;
    if (!q) return;
    timeout = setTimeout(() => {
        fetch(`/search/api/autocomplete?q=${q}`)
            .then(r => r.json())
            .then(results => {
                suggestionsList.innerHTML = '';
                if (!results || results.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = 'Không tìm thấy tên địa điểm. Vui lòng thử lại hoặc thêm địa điểm mới bằng cách nhấn chuột phải vào bản đồ.';
                    li.style.cssText = `padding: 8px; border-bottom: 1px solid #eee;`
                    suggestionsList.appendChild(li);
                    return;
                }
                const center = map.getCenter();
                results.sort((a, b) => {
                    const distA = Math.pow(a.lat - center.lat, 2) + Math.pow(a.lng - center.lng, 2);
                    const distB = Math.pow(b.lat - center.lat, 2) + Math.pow(b.lng - center.lng, 2);
                    return distA - distB;
                });
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
                <h3 class="modal-title">Thêm địa điểm còn thiếu</h3>
                <p class="modal-sub">Các trường có dấu * là bắt buộc.</p>
                <p class="modal-sub"><strong>Tọa độ:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                <p class="modal-sub"><strong>Địa chỉ:</strong> <span id="reverse-address">Đang tải...</span></p>

                <div class="modal-field">
                    <label for="place-name-input">Tên địa điểm *</label>
                    <input type="text" id="place-name-input" name="place-name-input" />
                </div>

                <div class="modal-field">
                    <label for="place-category-input">Loại địa điểm *</label>
                    <select id="place-category-input">
                        <option value="">Chọn loại địa điểm</option>
                        <option value="Hotel">Khách sạn</option>
                        <option value="Restaurant">Nhà hàng</option>
                        <option value="Attraction">Điểm tham quan</option>
                    </select>
                </div>

                <div class="modal-field">
                    <label for="place-price-input">Mức giá (tuỳ chọn)</label>
                    <input type="number" id="place-price-input" name="place-price-input" placeholder="Ví dụ: 500000" />
                </div>

                <div class="modal-field">
                    <label for="place-opening-input">Giờ mở cửa (tuỳ chọn)</label>
                    <input type="text" id="place-opening-input" name="place-opening-input" placeholder="Ví dụ: 08:00 - 22:00" />
                </div>

                <div class="modal-buttons">
                    <button id="cancel-place" class="btn-secondary">Huỷ</button>
                    <button id="submit-place" class="btn-primary">Gửi duyệt</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(form);

    fetch(`/map/api/reverse?lat=${lat}&lng=${lng}`)
        .then(r => r.text())
        .then(address => {
            document.getElementById('reverse-address').innerHTML = address;
        });
    
    document.getElementById('submit-place').addEventListener('click', async () => {
        const name = document.getElementById('place-name-input').value.trim();
        const category = document.getElementById('place-category-input').value;
        const price = document.getElementById('place-price-input').value.trim();
        const openingHours = document.getElementById('place-opening-input').value.trim();
        
        if (!name || !category) {
            alert('Vui lòng điền đầy đủ các trường bắt buộc.');
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
        const response = await fetch('/map/api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            body: JSON.stringify({ name, category, lat, lng, price, openingHours })
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.msg || 'Đã gửi địa điểm thành công. Vui lòng chờ quản trị viên xác nhận.');
            marker.remove();
        } else {
            alert(result.msg || 'Có lỗi khi gửi địa điểm.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi khi gửi địa điểm.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const ratingInput = document.getElementById('rating');
    const categoryInput = document.getElementById('category');
    const sortInput = document.getElementById('sort');
    
    if (minPriceInput) minPriceInput.addEventListener('change', (e) => {
        filterState.price_min = e.target.value ? parseFloat(e.target.value) : null;
        applyFilters();
    });
    if (maxPriceInput) maxPriceInput.addEventListener('change', (e) => {
        filterState.price_max = e.target.value ? parseFloat(e.target.value) : null;
        applyFilters();
    });
    if (ratingInput) ratingInput.addEventListener('change', (e) => {
        filterState.rating = e.target.value ? parseFloat(e.target.value) : null;
        applyFilters();
    });
    if (categoryInput) categoryInput.addEventListener('change', (e) => {
        filterState.category = e.target.value || null;
        applyFilters();
    });
    if (sortInput) sortInput.addEventListener('change', (e) => {
        filterState.sort = e.target.value || "";
        applyFilters();
    });
    
    // Initial load
    setPlaceMarkers();
});