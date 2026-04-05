const itinerary = {
    locations: [], // Array of {id, name, lat, lng, category, note}
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
            note: '' // For user notes
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
        
        // Add number label
        const label = L.marker([location.lat, location.lng], {
            icon: L.divIcon({
                className: 'route-number-marker',
                html: `<div>${index + 1}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            })
        }).addTo(map);
        
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
                <textarea class="item-note" placeholder="Add a note..." data-index="${index}">${location.note || ''}</textarea>
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
                showPlaceInfo(location.id);
            }
        });
        
        // Remove button
        li.querySelector('.btn-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            itinerary.removeLocation(index);
            renderItineraryList();
            drawRoute();
        });

        li.querySelector('.item-note').addEventListener('change', (e) => {
            const idx = e.target.dataset.index;
            itinerary.locations[idx].note = e.target.value;
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
    const mapRoot = document.getElementById('map');
    if (!panel) return;
    
    itineraryVisible = !itineraryVisible;
    
    if (itineraryVisible) {
        panel.classList.remove('hidden');
        if (mapRoot) mapRoot.classList.add('itinerary-open');
        renderItineraryList();
        if (itinerary.locations.length > 0) {
            drawRoute();
        }
    } else {
        panel.classList.add('hidden');
        if (mapRoot) mapRoot.classList.remove('itinerary-open');
        // Clear route visualization
        itinerary.polylines.forEach(p => map.removeLayer(p));
        itinerary.markers.forEach(m => map.removeLayer(m));
        itinerary.polylines = [];
        itinerary.markers = [];
    }
}

async function saveItinerary() {
    if (itinerary.locations.length === 0) {
        alert('Add locations to your itinerary first');
        return;
    }
    
    const name = prompt('Name your itinerary:');
    if (!name) return;
    
    try {
        const response = await fetch('/itinerary/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            body: JSON.stringify({
                title: name,
                items: itinerary.locations.map((loc, idx) => ({
                    placeId: loc.id,
                    sequence: idx,
                    notes: loc.note || ''
                }))
            })
        });
        
        if (response.ok) {
            alert(`Itinerary "${name}" saved!`);
            if (window.SmartNotify && window.SmartNotify.push) {
                window.SmartNotify.push({
                    type: 'itinerary',
                    title: 'Đã lưu lịch trình',
                    message: `Lịch trình "${name}" đã được lưu thành công.`
                });
            }
            itinerary.locations = [];
            renderItineraryList();
        }
    } catch (error) {
        console.error('Save failed:', error);
        alert('Failed to save itinerary');
    }
}

document.getElementById('load-itinerary').addEventListener('click', openLoadModal);

async function openLoadModal() {
    const overlay = document.getElementById('load-modal-overlay');
    const container = document.getElementById('itineraries-list');
    
    try {
        const response = await fetch('/itinerary/api/list', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        const data = await response.json();
        console.log('Loaded itineraries:', data);
        
        if (data.length === 0) {
            container.innerHTML = '<p class="empty-state" style="text-align: center; color: #999; padding: 20px; margin: 0;">No saved itineraries yet</p>';
        } else {
            container.innerHTML = data.map(itinerary => `
                <div class="itinerary-card" data-id="${itinerary.ID}">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 4px 0; font-size: 14px;">${escapeHtml(itinerary.Title)}</h4>
                        <p style="margin: 0; font-size: 12px; color: #666;">
                            ${itinerary.ItemCount} location${itinerary.ItemCount !== 1 ? 's' : ''} • 
                            ${new Date(itinerary.CreatedAt).toLocaleString()}
                        </p>
                    </div>
                    <button class="btn-delete" data-id="${itinerary.ID}">Delete</button>
                    <button class="btn-edit" data-id="${itinerary.ID}">Edit Title</button>
                    <button class="btn-load" data-id="${itinerary.ID}">Load</button>
                </div>
            `).join('');
            
            // Add hover effects
            container.querySelectorAll('.itinerary-card').forEach(card => {
                card.addEventListener('mouseenter', () => {
                    card.style.background = '#f9f9f9';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.background = 'transparent';
                });
            });
            
            // Add click handlers to load buttons
            container.querySelectorAll('.btn-load').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = '#45a049';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = '#4CAF50';
                });
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const itineraryId = e.target.dataset.id;
                    loadSavedItinerary(itineraryId);
                    overlay.classList.add('hidden');
                });
            });

            container.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = '#d32f2f';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = '#f44336';
                });
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const itineraryId = e.target.dataset.id;
                    if (confirm('Are you sure you want to delete this itinerary?')) {
                        try {
                            const response = await fetch(`/itinerary/api/${itineraryId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                            });
                            if (response.ok) {
                                e.target.closest('.itinerary-card').remove();
                            } else {
                                alert('Failed to delete itinerary');
                            }
                        } catch (error) {
                            console.error('Delete failed:', error);
                            alert('Failed to delete itinerary');
                        }
                    }
                });
            });
            container.querySelectorAll('.btn-edit').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = '#1976d2';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = '#2196F3';
                });
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const itineraryId = e.target.dataset.id;
                    const newTitle = prompt('Enter new title for this itinerary:', e.target.closest('.itinerary-card').querySelector('h4').textContent);
                    if (newTitle) {
                        fetch(`/itinerary/api/${itineraryId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
                            body: JSON.stringify({ title: newTitle })
                        }).then(response => {
                            if (response.ok) {
                                e.target.closest('.itinerary-card').querySelector('h4').textContent = newTitle;
                            } else {
                                alert('Failed to update title');
                            }
                        }).catch(error => {
                            console.error('Update failed:', error);
                            alert('Failed to update title');
                        });
                    }
                });
            });
        }
        overlay.classList.remove('hidden');
    } catch (error) {
        console.error('Failed to load itineraries:', error);
        alert('Failed to load saved itineraries');
    }
}

// Close modal handlers
document.getElementById('cancel-load').addEventListener('click', () => {
    document.getElementById('load-modal-overlay').classList.add('hidden');
});

// Close modal when clicking outside
document.getElementById('load-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'load-modal-overlay') {
        document.getElementById('load-modal-overlay').classList.add('hidden');
    }
});

// Utility function to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadSavedItinerary(itineraryId) {
    try {
        const response = await fetch(`/itinerary/api/${itineraryId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        const data = await response.json();
        
        itinerary.locations = data.items.map(item => ({
            id: item.placeId,
            name: item.placeName,
            lat: item.lat,
            lng: item.lng,
            category: item.category,
            price: item.price,
            rating: item.rating,
            note: item.notes || ''
        }));
        
        renderItineraryList();
        drawRoute();
    } catch (error) {
        console.error('Load failed:', error);
        alert('Failed to load itinerary');
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
})
