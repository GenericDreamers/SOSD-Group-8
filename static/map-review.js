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
        btn.textContent = 'Chỉnh sửa đánh giá';
    } else {
        btn.textContent = 'Thêm đánh giá';
    }
}

function renderReviews(reviews) {
    const list = document.getElementById('reviews-list');
    if (reviews.length === 0) {
        list.innerHTML = '<li>Chưa có đánh giá nào.</li>';
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
                    <button class="btn-small btn-edit" onclick="addReview()">Sửa</button>
                    <button class="btn-small btn-delete" onclick="deleteReview(${r.ID})">Xóa</button>
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

    info.textContent = `${start}-${end} trên ${totalReviews}`;
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
        alert('Chưa chọn địa điểm.');
        return;
    }
    console.log('Adding/editing review for place ID:', currentPlaceId, 'Existing review:', review);

    const form = document.createElement('div');
    form.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                                <h3 class="modal-title">${review ? 'Chỉnh sửa đánh giá' : 'Thêm đánh giá'}</h3>
                                <p class="modal-sub">Tất cả trường đánh dấu * là bắt buộc.</p>
                                <div class="modal-field">
                                    <label for="review-rating-input">Đánh giá (1-5 sao) *</label>
                                    <select id="review-rating-input">
                                        <option value="">Chọn số sao</option>
                    <option value="1" ${review && review.Stars == 1 ? 'selected' : ''}>1★</option>
                    <option value="2" ${review && review.Stars == 2 ? 'selected' : ''}>2★</option>
                    <option value="3" ${review && review.Stars == 3 ? 'selected' : ''}>3★</option>
                    <option value="4" ${review && review.Stars == 4 ? 'selected' : ''}>4★</option>
                    <option value="5" ${review && review.Stars == 5 ? 'selected' : ''}>5★</option>
                                    </select>
                                </div>
                                <div class="modal-field">
                                    <label for="review-content-input">Nội dung</label>
                                    <textarea id="review-content-input" name="review-content-input" rows="4" placeholder="Chia sẻ trải nghiệm của bạn...">${review && review.Content != null ? review.Content : ''}</textarea>
                                </div>
                <div class="modal-buttons">
                                        <button id="cancel-review" class="btn-secondary">Hủy</button>
                                        <button id="submit-review" class="btn-primary">${review ? 'Lưu' : 'Gửi'}</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(form);
    
    document.getElementById('submit-review').addEventListener('click', async () => {
        const rating = document.getElementById('review-rating-input').value;
        const content = document.getElementById('review-content-input').value.trim();
        
        if (!rating) {
            alert('Vui lòng chọn số sao.');
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
        alert('Bạn cần đăng nhập để gửi đánh giá.');
        return;
    }

    try {
        const response = await fetch('/review/api/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ placeID: placeId, stars: rating, comment: content })
        });
        
        if (response.ok) {
            alert('Gửi đánh giá thành công!');
            loadReviews(placeId, 1);
        } else {
            const error = await response.json();
            alert(`Lỗi: ${error.msg || 'Không thể gửi đánh giá'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi khi gửi đánh giá.');
    }
}

async function updateReview(reviewId, rating, content) {
    if (!token) {
        alert('Bạn cần đăng nhập để cập nhật đánh giá.');
        return;
    }

    try {
        const response = await fetch(`/review/api/update/${reviewId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ stars: rating, comment: content })
        });
        
        if (response.ok) {
            alert('Cập nhật đánh giá thành công!');
            loadReviews(currentPlaceId, currentPage);
        } else {
            const error = await response.json();
            alert(`Lỗi: ${error.msg || 'Không thể cập nhật đánh giá'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi khi cập nhật đánh giá.');
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Bạn có chắc chắn muốn xóa đánh giá của mình?')) {
        return;
    }
    
    if (!token) {
        alert('Bạn cần đăng nhập để xóa đánh giá.');
        return;
    }

    try {
        const response = await fetch(`/review/api/delete/${reviewId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('Xóa đánh giá thành công!');
            loadReviews(currentPlaceId, currentPage);
        } else {
            const error = await response.json();
            alert(`Lỗi: ${error.msg || 'Không thể xóa đánh giá'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi khi xóa đánh giá.');
    }
}