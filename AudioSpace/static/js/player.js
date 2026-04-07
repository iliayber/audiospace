// ============================================
// ПЛЕЕР С ВОЛНОВОЙ ВИЗУАЛИЗАЦИЕЙ
// ============================================

let currentTrackId = null;
let currentAudio = null;
let isPlaying = false;
let wavesurfer = null;
let currentAudioUrl = null;

// ИНИЦИАЛИЗАЦИЯ WAVESURFER
function initWavesurfer() {
    if (wavesurfer) {
        wavesurfer.destroy();
    }
    
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#00ffff',
        progressColor: '#ff00ff',
        cursorColor: '#ffffff',
        cursorWidth: 2,
        height: 60,
        barWidth: 3,
        barGap: 2,
        barRadius: 3,
        normalize: true,
        responsive: true,
        fillParent: true,
        interact: true,
        dragToSeek: true
    });
    
    // При клике на волну - перемотка
    wavesurfer.on('interaction', () => {
        if (currentAudio) {
            currentAudio.currentTime = wavesurfer.getCurrentTime();
        }
    });
    
    // При окончании трека
    wavesurfer.on('finish', () => {
        if (currentAudio) {
            currentAudio.pause();
            isPlaying = false;
            updatePlayButton(false);
        }
    });
    
    // При изменении времени - обновляем таймер
    wavesurfer.on('timeupdate', (currentTime) => {
        const minutes = Math.floor(currentTime / 60);
        const seconds = Math.floor(currentTime % 60);
        document.getElementById('current-time').innerText = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    });
    
    // При загрузке волн - получаем длительность
    wavesurfer.on('ready', () => {
        const duration = wavesurfer.getDuration();
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        document.getElementById('duration').innerText = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    });
}

// ФУНКЦИЯ ВОСПРОИЗВЕДЕНИЯ
function playTrack(trackId, audioUrl, title, artist) {
    // Если это тот же трек и он играет - ставим на паузу
    if (currentTrackId === trackId && isPlaying) {
        if (wavesurfer) wavesurfer.pause();
        if (currentAudio) currentAudio.pause();
        isPlaying = false;
        updatePlayButton(false);
        return;
    }
    
    // Если это тот же трек и он на паузе - играем дальше
    if (currentTrackId === trackId && !isPlaying) {
        if (wavesurfer) wavesurfer.play();
        if (currentAudio) currentAudio.play();
        isPlaying = true;
        updatePlayButton(true);
        return;
    }
    
    // Иначе загружаем новый трек
    if (currentAudio) {
        currentAudio.pause();
    }
    
    currentTrackId = trackId;
    currentAudioUrl = audioUrl;
    
    // Загружаем волны
    if (wavesurfer) {
        wavesurfer.load(audioUrl);
    } else {
        initWavesurfer();
        wavesurfer.load(audioUrl);
    }
    
    // Создаём аудиоэлемент для управления
    currentAudio = new Audio(audioUrl);
    currentAudio.play();
    isPlaying = true;
    updatePlayButton(true);
    
    // Обновляем информацию в плеере
    document.getElementById('now-playing-title').innerText = title;
    document.getElementById('now-playing-artist').innerText = artist;
    
    // Синхронизируем wavesurfer с аудио
    currentAudio.addEventListener('timeupdate', () => {
        if (wavesurfer && !wavesurfer.isPlaying()) {
            const currentTime = currentAudio.currentTime;
            if (Math.abs(wavesurfer.getCurrentTime() - currentTime) > 0.1) {
                wavesurfer.seekTo(currentTime / wavesurfer.getDuration());
            }
        }
    });
    
    // При окончании трека через аудио
    currentAudio.addEventListener('ended', () => {
        if (wavesurfer) wavesurfer.stop();
        isPlaying = false;
        updatePlayButton(false);
    });
}

// КНОПКА PLAY/PAUSE
function togglePlay() {
    if (!currentAudio) return;
    
    if (isPlaying) {
        if (wavesurfer) wavesurfer.pause();
        currentAudio.pause();
        isPlaying = false;
        updatePlayButton(false);
    } else {
        if (wavesurfer) wavesurfer.play();
        currentAudio.play();
        isPlaying = true;
        updatePlayButton(true);
    }
}

// ОБНОВЛЕНИЕ КНОПКИ
function updatePlayButton(playing) {
    const btn = document.getElementById('play-pause-btn');
    if (btn) {
        btn.innerText = playing ? '⏸' : '▶';
    }
}

// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
document.addEventListener('DOMContentLoaded', () => {
    initWavesurfer();
});