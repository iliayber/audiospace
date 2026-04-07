from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret-key-for-audiospace'
import os

DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['UPLOAD_FOLDER'] = 'static/uploads/tracks/'
app.config['MAX_CONTENT_LENGTH'] = 30 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('static/uploads/covers/', exist_ok=True)
os.makedirs('static/css/', exist_ok=True)
os.makedirs('static/js/', exist_ok=True)
os.makedirs('templates/', exist_ok=True)

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# ===== МОДЕЛИ =====
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    avatar = db.Column(db.String(200), default='default.jpg')
    bio = db.Column(db.String(200), default='')

class Track(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    artist = db.Column(db.String(100), nullable=False)
    genre = db.Column(db.String(50))
    file_path = db.Column(db.String(200), nullable=False)
    cover_path = db.Column(db.String(200), default='default_cover.jpg')
    play_count = db.Column(db.Integer, default=0)
    likes_count = db.Column(db.Integer, default=0)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    user = db.relationship('User', backref='tracks')

class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    track_id = db.Column(db.Integer, db.ForeignKey('track.id'))

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    track_id = db.Column(db.Integer, db.ForeignKey('track.id'))
    user = db.relationship('User', backref='comments')

class Playlist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    is_public = db.Column(db.Boolean, default=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    user = db.relationship('User', backref='playlists')

class PlaylistTrack(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    playlist_id = db.Column(db.Integer, db.ForeignKey('playlist.id'))
    track_id = db.Column(db.Integer, db.ForeignKey('track.id'))
    order = db.Column(db.Integer, default=0)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ===== МАРШРУТЫ =====
@app.route('/')
def index():
    tracks = Track.query.order_by(Track.play_count.desc()).limit(20).all()
    return render_template('index.html', tracks=tracks)

@app.route('/library')
def library():
    tracks = Track.query.all()
    return render_template('library.html', tracks=tracks)

@app.route('/upload', methods=['GET', 'POST'])
@login_required
def upload():
    if request.method == 'POST':
        title = request.form['title']
        artist = request.form['artist']
        genre = request.form['genre']
        audio_file = request.files['audio_file']
        
        if audio_file and audio_file.filename.endswith('.mp3'):
            filename = secure_filename(audio_file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            audio_file.save(file_path)
            
            track = Track(
                title=title,
                artist=artist,
                genre=genre,
                file_path=file_path,
                user_id=current_user.id
            )
            db.session.add(track)
            db.session.commit()
            return redirect(url_for('index'))
    
    return render_template('upload.html')

@app.route('/track/<int:track_id>')
def track(track_id):
    track = Track.query.get_or_404(track_id)
    comments = Comment.query.filter_by(track_id=track_id).all()
    return render_template('track.html', track=track, comments=comments)

@app.route('/profile/<username>')
def profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    tracks = Track.query.filter_by(user_id=user.id).all()
    return render_template('profile.html', profile_user=user, tracks=tracks)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('index'))
        return 'Неверное имя или пароль'
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = generate_password_hash(request.form['password'])
        user = User(username=username, password=password)
        db.session.add(user)
        db.session.commit()
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# ===== API =====
@app.route('/like/<int:track_id>', methods=['POST'])
@login_required
def like(track_id):
    track = Track.query.get_or_404(track_id)
    existing = Like.query.filter_by(user_id=current_user.id, track_id=track_id).first()
    
    if existing:
        db.session.delete(existing)
        track.likes_count -= 1
        liked = False
    else:
        like = Like(user_id=current_user.id, track_id=track_id)
        db.session.add(like)
        track.likes_count += 1
        liked = True
    
    db.session.commit()
    return jsonify({'liked': liked, 'likes_count': track.likes_count})

@app.route('/comment/<int:track_id>', methods=['POST'])
@login_required
def add_comment(track_id):
    content = request.form.get('content')
    if content:
        comment = Comment(
            content=content,
            user_id=current_user.id,
            track_id=track_id
        )
        db.session.add(comment)
        db.session.commit()
    return redirect(url_for('track', track_id=track_id))

@app.route('/api/search')
def search():
    query = request.args.get('q', '')
    tracks = Track.query.filter(Track.title.contains(query) | Track.artist.contains(query)).all()
    results = [{'id': t.id, 'title': t.title, 'artist': t.artist} for t in tracks]
    return jsonify({'results': results})

# ===== УДАЛЕНИЕ ТРЕКА =====
@app.route('/delete_track/<int:track_id>', methods=['POST'])
@login_required
def delete_track(track_id):
    track = Track.query.get_or_404(track_id)
    
    if track.user_id != current_user.id and current_user.username != 'admin':
        return jsonify({'error': 'Нет прав'}), 403
    
    # Удаляем файл
    if os.path.exists(track.file_path):
        os.remove(track.file_path)
    
    # Удаляем комментарии и лайки
    Comment.query.filter_by(track_id=track_id).delete()
    Like.query.filter_by(track_id=track_id).delete()
    PlaylistTrack.query.filter_by(track_id=track_id).delete()
    
    db.session.delete(track)
    db.session.commit()
    
    return jsonify({'success': True})

# ===== РЕДАКТИРОВАНИЕ ТРЕКА =====
@app.route('/edit_track/<int:track_id>', methods=['GET', 'POST'])
@login_required
def edit_track(track_id):
    track = Track.query.get_or_404(track_id)
    
    if track.user_id != current_user.id and current_user.username != 'admin':
        return 'Нет прав', 403
    
    if request.method == 'POST':
        track.title = request.form['title']
        track.artist = request.form['artist']
        track.genre = request.form['genre']
        db.session.commit()
        return redirect(url_for('track', track_id=track.id))
    
    return render_template('edit_track.html', track=track)

# ===== ЗАПУСК =====
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if User.query.count() == 0:
            test_user = User(username='admin', password=generate_password_hash('123'))
            db.session.add(test_user)
            db.session.commit()
            print('Создан тестовый пользователь: admin / 123')
    app.run(debug=True)