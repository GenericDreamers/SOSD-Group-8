let currentPage = 1;
const perPage = 5;
let totalReviews = 0;
let userReview = null; // Store the current user's review if it exists
const token = localStorage.getItem('access_token');

/* Load reviews for a given place */
async function loadReviews(placeId, page = 1) {
    currentPlaceId = placeId;
    currentPage = page;

    const resp = await fetch(`/review/api/list/${placeId}?page=${page}&per_page=${perPage}`);
    const data = await resp.json();
    totalReviews = data.total;

    await checkUserReview(placeId);
    renderReviews(data.items);
    updateNav();
}

async function checkUserReview(placeId) {
    if (!token) {
        userReview = null;
        updateAddReviewButton();
        return;
    }
    
    try {
        const response = await fetch(`/review/api/user/${placeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            userReview = await response.json();
        } else {
            userReview = null;
        }
    } catch (error) {
        console.error('Error checking user review:', error);
        userReview = null;
    }
    
    updateAddReviewButton();
}

function updateAddReviewButton() {
    const btn = document.getElementById('add-review');
    
    if (userReview) {
        btn.textContent = '✏️ Edit your review';
    } else {
        btn.textContent = '+ Add review';
    }
}

function renderReviews(reviews) {
    const list = document.getElementById('reviews-list');
    if (reviews.length === 0) {
        list.innerHTML = '<li>No reviews yet.</li>';
        return;
    }
    
    list.innerHTML = reviews.map(r => {
        console.log("Comparing review ID:", r.ID, "with user review ID:", userReview ? userReview.ID : null);
        const isUserReview = userReview && userReview.ID === r.ID;
        console.log("isUserReview returned: ", isUserReview)
        let reviewHTML = `
            <li class="${isUserReview ? 'user-review' : ''}">
                <strong>${r.Stars}★</strong> - ${r.Content}
                <br><small>by ${r.Username} on ${new Date(r.CreatedAt).toLocaleDateString()}</small>
        `;
        
        if (isUserReview && token) {
            reviewHTML += `
                <div class="review-actions">
                    <button class="btn-small btn-edit" onclick="addReview()">Edit</button>
                    <button class="btn-small btn-delete" onclick="deleteReview(${r.ID})">Delete</button>
                </div>
            `;
        }
        
        reviewHTML += '</li>';
        return reviewHTML;
    }).join('');
}

function updateNav() {
    const prevBtn = document.getElementById('prev-rev');
    const nextBtn = document.getElementById('next-rev');
    const info   = document.getElementById('rev-info');

    const start = (currentPage - 1) * perPage + 1;
    const end   = Math.min(currentPage * perPage, totalReviews);

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = end >= totalReviews;

    info.textContent = `${start}-${end} of ${totalReviews}`;
}

document.getElementById('prev-rev').addEventListener('click', () => {
    if (currentPage > 1) loadReviews(currentPlaceId, currentPage - 1);
});

document.getElementById('next-rev').addEventListener('click', () => {
    if ((currentPage * perPage) < totalReviews) loadReviews(currentPlaceId, currentPage + 1);
});

document.getElementById('add-review').addEventListener('click', function(e) {
    addReview()
});

function addReview() {
    const review = userReview; // If user has a review, edit it instead of adding a new one
    if (!currentPlaceId) {
        alert('No place selected');
        return;
    }
    console.log('Adding/editing review for place ID:', currentPlaceId, 'Existing review:', review);

    const form = document.createElement('div');
    form.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h3>${review ? 'Edit' : 'Add'} Review</h3>
                <p>All fields marked with "*" are required.</p>
                <label for="review-rating-input">Rating (1-5 stars) *</label><br>
                <select id="review-rating-input">
                    <option value="">Select rating</option>
                    <option value="1" ${review && review.Stars == 1 ? 'selected' : ''}>1★</option>
                    <option value="2" ${review && review.Stars == 2 ? 'selected' : ''}>2★</option>
                    <option value="3" ${review && review.Stars == 3 ? 'selected' : ''}>3★</option>
                    <option value="4" ${review && review.Stars == 4 ? 'selected' : ''}>4★</option>
                    <option value="5" ${review && review.Stars == 5 ? 'selected' : ''}>5★</option>
                </select> <br>
                <label for="review-content-input">Review</label><br>
                <textarea id="review-content-input" name="review-content-input" rows="4">${review && review.Content != null ? review.Content : ''}</textarea> <br>
                <div class="modal-buttons">
                    <button id="submit-review">Submit</button>
                    <button id="cancel-review">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(form);
    
    document.getElementById('submit-review').addEventListener('click', async () => {
        const rating = document.getElementById('review-rating-input').value;
        const content = document.getElementById('review-content-input').value.trim();
        
        if (!rating) {
            alert('Please fill in all required fields');
            return;
        }
        if (review) {
            await updateReview(review.ID, rating, content);
        } else {
            await submitReview(currentPlaceId, rating, content);
        }
        form.remove();
    });
    
    document.getElementById('cancel-review').addEventListener('click', () => {
        form.remove();
    });
}

async function submitReview(placeId, rating, content) {
    if (!token) {
        alert('You must be logged in to submit a review');
        return;
    }

    try {
        const response = await fetch('/review/api/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ placeID: placeId, stars: rating, comment: content })
        });
        
        if (response.ok) {
            alert('Review submitted successfully!');
            loadReviews(placeId, 1);
        } else {
            const error = await response.json();
            alert(`Error: ${error.msg || 'Failed to submit review'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting review.');
    }
}

async function updateReview(reviewId, rating, content) {
    if (!token) {
        alert('You must be logged in to update a review');
        return;
    }

    try {
        const response = await fetch(`/review/api/update/${reviewId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ stars: rating, comment: content })
        });
        
        if (response.ok) {
            alert('Review updated successfully!');
            loadReviews(currentPlaceId, currentPage);
        } else {
            const error = await response.json();
            alert(`Error: ${error.msg || 'Failed to update review'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating review.');
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete your review?')) {
        return;
    }
    
    if (!token) {
        alert('You must be logged in to delete a review');
        return;
    }

    try {
        const response = await fetch(`/review/api/delete/${reviewId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('Review deleted successfully!');
            loadReviews(currentPlaceId, currentPage);
        } else {
            const error = await response.json();
            alert(`Error: ${error.msg || 'Failed to delete review'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting review.');
    }
}