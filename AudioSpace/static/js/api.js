function likeTrack(trackId, buttonElement) {
    fetch('/like/' + trackId, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.liked) {
            if (buttonElement) {
                buttonElement.classList.add('liked');
                buttonElement.innerHTML = '❤️ Лайк (' + data.likes_count + ')';
            }
        } else {
            if (buttonElement) {
                buttonElement.classList.remove('liked');
                buttonElement.innerHTML = '❤️ Лайк (' + data.likes_count + ')';
            }
        }
    })
    .catch(error => console.error('Ошибка:', error));
}

function deleteTrack(trackId) {
    if (confirm('Вы уверены, что хотите удалить этот трек?')) {
        fetch('/delete_track/' + trackId, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Трек удалён!');
                location.reload();
            } else {
                alert('Ошибка при удалении');
            }
        });
    }
}

function searchTracks() {
    const query = document.getElementById('search-input').value;
    if (query.length < 2) return;
    
    fetch('/api/search?q=' + encodeURIComponent(query))
        .then(response => response.json())
        .then(data => {
            const resultsDiv = document.getElementById('search-results');
            if (resultsDiv) {
                resultsDiv.innerHTML = '';
                data.results.forEach(track => {
                    const div = document.createElement('div');
                    div.innerHTML = `${track.title} - ${track.artist}`;
                    resultsDiv.appendChild(div);
                });
            }
        });
}