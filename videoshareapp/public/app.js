const firebaseConfig = {
  apiKey: "AIzaSyDuNPLWLiTgUN-GaMwRkBUkW8oHsLHzpsk",
  authDomain: "videoshareapp-ed526.firebaseapp.com",
  projectId: "videoshareapp-ed526",
  storageBucket: "videoshareapp-ed526.appspot.com",
  messagingSenderId: "447982823426",
  appId: "1:447982823426:web:73f91eeeebbf5576d89f1b",
  measurementId: "G-RKGM567ZBN"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function signup() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || !password) return alert("Enter email and password");

  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      return db.collection("users").doc(cred.user.uid).set({
        email: cred.user.email,
        role: "consumer"
      });
    })
    .then(() => alert("Signup successful"))
    .catch(err => alert(err.message));
}


function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || !password) return alert("Enter email and password");

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById("user-info").style.display = "block";
      document.getElementById("user-email").innerText = auth.currentUser.email;
      
      const greeting = document.createElement('div');
      greeting.innerText = `Welcome back, ${auth.currentUser.email.split('@')[0]}!`;
      greeting.className = 'welcome-banner';
      document.querySelector('header').appendChild(greeting);
    })
    .catch(err => alert(err.message));
}


function logout() {
  auth.signOut().then(() => {
    alert("Logged out");
    location.reload();
  });
}


auth.onAuthStateChanged(async (user) => {
  if (user) {
    document.getElementById("user-email").innerText = user.email;
    document.getElementById("user-info").style.display = "block";
    document.getElementById("auth-box").style.display = "none";

    const userDoc = await db.collection("users").doc(user.uid).get();
    const role = userDoc.exists ? userDoc.data().role : "consumer";

    document.getElementById("upload-area").style.display = role === "creator" ? "block" : "none";
    document.getElementById("admin-panel").style.display = role === "admin" ? "block" : "none";

    loadVideos();
  } else {
    document.getElementById("user-info").style.display = "none";
    document.getElementById("auth-box").style.display = "block";
    document.getElementById("upload-area").style.display = "none";
    document.getElementById("admin-panel").style.display = "none";
  }
});


function uploadToCloudinary() {
  cloudinary.openUploadWidget({
    cloudName: 'videoshareapp',
    uploadPreset: 'test_unsigned',
    sources: ['local'],
    resourceType: 'video'
  },
    (error, result) => {
      if (!error && result && result.event === "success") {
        const title = document.getElementById("title").value.trim();
        const genre = document.getElementById("genre").value.trim();
        const ageRating = document.getElementById("ageRating").value.trim();
        const mood = document.getElementById("mood").value.trim();
        const emojis = document.getElementById("emojis").value.trim();
        db.collection("videos").add({
          title,
          genre,
          ageRating,
          mood,
          emojis,
          videoUrl: result.info.secure_url,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => alert("Video uploaded!"));
      }
    }
  );
}


function loadVideos() {
  document.getElementById("loading").style.display = "block";

  db.collection("videos").orderBy("createdAt", "desc").limit(10).get()
    .then(snapshot => {
      const list = document.getElementById("video-list");
      list.innerHTML = "";

      let count = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        const cardHtml = renderVideoCard(doc.id, data);
        list.innerHTML += cardHtml;
        count++;
      });
      console.log("Videos rendered:", count);
      document.getElementById("loading").style.display = "none";
    })
    .catch(err => {
      console.error(err);
      alert("Failed to load videos");
      document.getElementById("loading").style.display = "none";
    });
}

function submitComment(videoId) {
  const input = document.getElementById(`comment-${videoId}`);
  const commentText = input.value.trim();
  if (!commentText) return;

  const user = auth.currentUser;
  if (!user) return alert("You must be logged in to comment.");

  db.collection("videos").doc(videoId).collection("comments").add({
    text: commentText,
    user: user.email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    input.value = "";
    loadComments(videoId);
  })
  .catch(err => alert("Failed to add comment: " + err.message));
}


function loadComments(videoId) {
  const commentDiv = document.getElementById(`comments-${videoId}`);
  commentDiv.innerHTML = "Loading...";

  db.collection("videos").doc(videoId).collection("comments")
    .orderBy("createdAt", "desc").limit(5).get()
    .then(snapshot => {
      if (snapshot.empty) {
        commentDiv.innerHTML = "<p>No comments yet.</p>";
        return;
      }
      commentDiv.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const user = auth.currentUser;
        commentDiv.innerHTML += `
          <div>
            <strong>${data.user}:</strong> ${data.text}
            <small>${data.createdAt?.toDate().toLocaleString() || ""}</small>
          </div>
        `;
      });
    });
}

function assignCreatorRole() {
  const email = document.getElementById("assign-email").value.trim();
  if (!email) return alert("Enter a valid email");

  db.collection("users").where("email", "==", email).get()
    .then(snapshot => {
      if (snapshot.empty) {
        document.getElementById("role-status").innerText = `No user found with email ${email}`;
        return;
      }
      snapshot.forEach(doc => {
        db.collection("users").doc(doc.id).set({ role: "creator" }, { merge: true })
          .then(() => {
            document.getElementById("role-status").innerText = `✅ ${email} is now a creator.`;
          });
      });
    }).catch(err => alert(err.message));
}

function renderVideoCard(id, data) {
  return `
    <div class="video-card" style="box-shadow:0 2px 12px #647dee22; border-radius:16px; margin-bottom:24px; padding:18px;">
      <h4 style="color:#647dee;">${data.title} <span class="badge" style="background:#e0e7ff;color:#647dee;">${data.ageRating}</span></h4>
      <div style="margin-bottom:6px;"><strong>Genre:</strong> ${data.genre}</div>
      <div style="margin-bottom:6px;"><strong>Mood/Theme:</strong> <span style="background:#f3f4f6;padding:2px 8px;border-radius:8px;">${data.mood || ''}</span>
        ${data.emojis ? `<span style="font-size:1.2em;">${data.emojis}</span>` : ''}
      </div>
      <video controls src="${data.videoUrl}" width="100%" style="border-radius:12px; margin-bottom:8px;"></video>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <button onclick="likeVideo('${id}')" style="background:#e0e7ff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;">👍 <span id="like-count-${id}">${data.likes || 0}</span></button>
        <button onclick="dislikeVideo('${id}')" style="background:#fee2e2;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;">👎 <span id="dislike-count-${id}">${data.dislikes || 0}</span></button>
        <span>⭐ Avg: <span id="avg-rating-${id}">${(data.avgRating || 0).toFixed(1)}</span></span>
        <input type="number" min="1" max="5" id="rating-${id}" style="width:40px;" placeholder="Rate"/>
        <button onclick="rateVideo('${id}')" style="background:#fbbf24;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;">Rate</button>
      </div>
      <div>
        <input type="text" id="comment-${id}" placeholder="Add a comment..." style="width:60%;padding:4px;border-radius:6px;border:1px solid #e5e7eb;"/>
        <button onclick="submitComment('${id}')" style="background:#647dee;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;">Comment</button>
      </div>
      <div id="comments-${id}" style="margin-top:8px;font-size:0.95em;"></div>
    </div>
  `;
}

function likeVideo(videoId) {
  db.collection("videos").doc(videoId).update({
    likes: firebase.firestore.FieldValue.increment(1)
  }).then(() => {
    updateVideoCounts(videoId);
  });
}

function dislikeVideo(videoId) {
  db.collection("videos").doc(videoId).update({
    dislikes: firebase.firestore.FieldValue.increment(1)
  }).then(() => {
    updateVideoCounts(videoId);
  });
}

function rateVideo(videoId) {
  const rating = parseInt(document.getElementById(`rating-${videoId}`).value);
  if (rating < 1 || rating > 5) return alert("Rate between 1 and 5");
  const user = auth.currentUser;
  if (!user) return alert("Login to rate");

  db.collection("videos").doc(videoId).collection("ratings").doc(user.uid).set({ rating })
    .then(() => updateAvgRating(videoId));
}

function updateVideoCounts(videoId) {
  db.collection("videos").doc(videoId).get().then(doc => {
    const data = doc.data();
    document.getElementById(`like-count-${videoId}`).innerText = data.likes || 0;
    document.getElementById(`dislike-count-${videoId}`).innerText = data.dislikes || 0;
  });
}

function updateAvgRating(videoId) {
  db.collection("videos").doc(videoId).collection("ratings").get().then(snapshot => {
    let total = 0, count = 0;
    snapshot.forEach(doc => {
      total += doc.data().rating;
      count++;
    });
    const avg = count ? total / count : 0;
    db.collection("videos").doc(videoId).update({ avgRating: avg });
    document.getElementById(`avg-rating-${videoId}`).innerText = avg.toFixed(1);
  });
}
