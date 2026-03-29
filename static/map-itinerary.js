const itinerary = {
    locations: [], // Array of {id, name, lat, lng, category, icon}
    polylines: [],
    markers: [],
    
    addLocation(place) {
        // Prevent duplicates
        if (this.locations.some(p => p.id === place.id)) {
            alert(`${place.name} is already in your itinerary`);
            return false;
        }
        
        this.locations.push({
            id: place.id,
            name: place.name,
            lat: place.lat,
            lng: place.lng,
            category: place.category,
            price: place.price,
            rating: place.rating
        });
        
        return true;
    },
    
    removeLocation(index) {
        this.locations.splice(index, 1);
    },
    
    reorder(fromIndex, toIndex) {
        const [moved] = this.locations.splice(fromIndex, 1);
        this.locations.splice(toIndex, 0, moved);
    },
    
    clear() {
        this.locations = [];
    },
    
    getCoordinates() {
        return this.locations.map(p => [p.lat, p.lng]);
    }
};

let itineraryVisible = false;

function drawRoute() {
    // Clear existing polylines and markers
    itinerary.polylines.forEach(p => map.removeLayer(p));
    itinerary.markers.forEach(m => map.removeLayer(m));
    itinerary.polylines = [];
    itinerary.markers = [];
    
    if (itinerary.locations.length < 2) return;
    
    const coords = itinerary.getCoordinates();
    
    // Draw main route polyline
    const routeLine = L.polyline(coords, {
        color: '#FF6B6B',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 5'
    }).addTo(map);
    itinerary.polylines.push(routeLine);
    
    // Add numbered stop markers
    itinerary.locations.forEach((location, index) => {
        const circleMarker = L.circleMarker([location.lat, location.lng], {
            radius: 20,
            fillColor: '#FF6B6B',
            color: '#fff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.85
        })
        .bindPopup(`<strong>${index + 1}. ${location.name}</strong><br>${location.category}`)
        .addTo(map);
        
        // Add number label
        const label = L.marker([location.lat, location.lng], {
            icon: L.divIcon({
                className: 'route-number-marker',
                html: `<div style="
                    width: 40px; height: 40px;
                    background: #FF6B6B;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 16px;
                    border: 2px solid white;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                ">${index + 1}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            })
        }).addTo(map);
        
        itinerary.markers.push(circleMarker);
        itinerary.markers.push(label);
    });
    
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateTotalDistance() {
    let total = 0;
    for (let i = 0; i < itinerary.locations.length - 1; i++) {
        const p1 = itinerary.locations[i];
        const p2 = itinerary.locations[i + 1];
        total += calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    }
    return total.toFixed(2);
}

function optimizeRoute() {
    if (itinerary.locations.length < 2) return;
    
    const unvisited = [...itinerary.locations];
    const optimized = [unvisited.shift()];
    
    while (unvisited.length > 0) {
        const current = optimized[optimized.length - 1];
        let nearest = unvisited[0];
        let minDistance = calculateDistance(current.lat, current.lng, nearest.lat, nearest.lng);
        let nearestIndex = 0;
        
        for (let i = 1; i < unvisited.length; i++) {
            const dist = calculateDistance(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
            if (dist < minDistance) {
                minDistance = dist;
                nearest = unvisited[i];
                nearestIndex = i;
            }
        }
        
        optimized.push(nearest);
        unvisited.splice(nearestIndex, 1);
    }
    
    itinerary.locations = optimized;
    renderItineraryList();
    drawRoute();
}

function renderItineraryList() {
    const list = document.getElementById('itinerary-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (itinerary.locations.length === 0) {
        list.innerHTML = '<li style="padding: 20px; text-align: center; color: #999;">No locations added yet</li>';
        document.getElementById('clear-itinerary').disabled = true;
        document.getElementById('save-itinerary').disabled = true;
        document.getElementById('optimize-route').disabled = true;
        return;
    }
    
    const distance = calculateTotalDistance();
    
    itinerary.locations.forEach((location, index) => {
        const li = document.createElement('li');
        li.className = 'itinerary-item';
        li.draggable = true;
        li.dataset.index = index;
        
        li.innerHTML = `
            <div class="item-number">${index + 1}</div>
            <div class="item-content">
                <h4>${location.name}</h4>
                <p class="item-category">${location.category}</p>
                <p class="item-rating">${location.rating ? location.rating + ' ★' : 'No rating'}</p>
            </div>
            <button class="btn-remove" data-index="${index}" aria-label="Remove">✕</button>
        `;
        
        // Drag start
        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            li.style.opacity = '0.5';
        });
        
        li.addEventListener('dragend', () => {
            li.style.opacity = '1';
        });
        
        // Drag over
        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            li.classList.add('drag-over');
        });
        
        li.addEventListener('dragleave', () => {
            li.classList.remove('drag-over');
        });
        
        // Drop
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            
            if (fromIndex !== toIndex) {
                itinerary.reorder(fromIndex, toIndex);
                renderItineraryList();
                drawRoute();
            }
            
            li.classList.remove('drag-over');
        });
        
        // Click to highlight on map
        li.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-remove')) {
                map.setView([location.lat, location.lng], 16);
            }
        });
        
        // Remove button
        li.querySelector('.btn-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            itinerary.removeLocation(index);
            renderItineraryList();
            drawRoute();
        });
        
        list.appendChild(li);
    });
    
    // Update distance display
    const distanceEl = document.getElementById('itinerary-distance');
    if (distanceEl) {
        distanceEl.textContent = `Total distance: ${distance} km`;
    }
    
    // Enable buttons
    document.getElementById('clear-itinerary').disabled = false;
    document.getElementById('save-itinerary').disabled = false;
    document.getElementById('optimize-route').disabled = false;
}

function toggleItineraryPanel() {
    const panel = document.getElementById('itinerary-panel');
    if (!panel) return;
    
    itineraryVisible = !itineraryVisible;
    
    if (itineraryVisible) {
        panel.classList.remove('hidden');
        renderItineraryList();
        if (itinerary.locations.length > 0) {
            drawRoute();
        }
    } else {
        panel.classList.add('hidden');
        // Clear route visualization
        itinerary.polylines.forEach(p => map.removeLayer(p));
        itinerary.markers.forEach(m => map.removeLayer(m));
        itinerary.polylines = [];
        itinerary.markers = [];
    }
}

function saveItinerary() {
    if (itinerary.locations.length === 0) {
        alert('Add locations to your itinerary first');
        return;
    }
    
    const name = prompt('Name your itinerary:');
    if (!name) return;
    
    const saved = JSON.parse(localStorage.getItem('savedItineraries') || '{}');
    saved[name] = itinerary.locations;
    localStorage.setItem('savedItineraries', JSON.stringify(saved));
    alert(`Itinerary "${name}" saved!`);
}

function loadSavedItinerary(name) {
    const saved = JSON.parse(localStorage.getItem('savedItineraries') || '{}');
    if (saved[name]) {
        itinerary.locations = saved[name];
        renderItineraryList();
        drawRoute();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    //Itinerary buttons
    const closeItineraryBtn = document.getElementById('close-itinerary');
    if (closeItineraryBtn) {
        closeItineraryBtn.addEventListener('click', toggleItineraryPanel);
    }
    const toggleItineraryBtn = document.getElementById('toggle-itinerary');
    if (toggleItineraryBtn) {
        toggleItineraryBtn.addEventListener('click', toggleItineraryPanel);
    }
    const clearBtn = document.getElementById('clear-itinerary');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear all locations from your route?')) {
                itinerary.clear();
                renderItineraryList();
                itinerary.polylines.forEach(p => map.removeLayer(p));
                itinerary.markers.forEach(m => map.removeLayer(m));
                itinerary.polylines = [];
                itinerary.markers = [];
            }
        });
    }
    const optimizeBtn = document.getElementById('optimize-route');
    if (optimizeBtn) {
        optimizeBtn.addEventListener('click', optimizeRoute);
    }
    const saveBtn = document.getElementById('save-itinerary');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveItinerary);
    }

    const addReviewBtn = document.getElementById('add-review');
    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', addReview);
    }
})
