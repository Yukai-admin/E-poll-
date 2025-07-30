// vote.js
const db = firebase.database();

function getAccessToken() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

async function fetchDiscordUser(token) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('無法取得使用者資料');
  return await res.json();
}

let currentUser = null;

async function init() {
  const token = getAccessToken();
  if (!token) {
    document.getElementById('user-info').innerHTML = '<a href="login.html" class="login-link">請先登入 Discord</a>';
    return;
  }

  try {
    currentUser = await fetchDiscordUser(token);
    document.getElementById('user-info').textContent = `歡迎，${currentUser.username}#${currentUser.discriminator}`;
    loadCandidates();
    checkUserVote();
    // 清除 URL hash 防止重複登入
    history.replaceState(null, '', window.location.pathname);
  } catch (err) {
    document.getElementById('user-info').innerHTML = '取得使用者資料失敗，請重新登入。<a href="login.html" class="login-link">重新登入</a>';
  }
}

function loadCandidates() {
  const candidatesRef = db.ref('candidates');
  candidatesRef.on('value', snapshot => {
    const data = snapshot.val();
    const ul = document.getElementById('candidate-list');
    ul.innerHTML = '';
    if (!data) {
      ul.innerHTML = '<li>尚無候選人</li>';
      return;
    }
    for (const id in data) {
      const li = document.createElement('li');
      li.textContent = data[id].name + ' ';
      const btn = document.createElement('button');
      btn.textContent = '投票 🗳️';
      btn.classList.add('vote-btn');
      btn.disabled = false;
      btn.onclick = () => vote(id);
      li.appendChild(btn);
      ul.appendChild(li);
    }
  });
}

function checkUserVote() {
  if (!currentUser) return;
  const votesRef = db.ref('votes');
  votesRef.orderByChild('userId').equalTo(currentUser.id).once('value', snapshot => {
    if (snapshot.exists()) {
      disableVoting('您已經投過票了，謝謝您的參與！');
    }
  });
}

function disableVoting(msg) {
  document.querySelectorAll('#candidate-list button.vote-btn').forEach(btn => btn.disabled = true);
  document.getElementById('message').textContent = msg;
}

function vote(candidateId) {
  if (!currentUser) return alert('請先登入');
  const votesRef = db.ref('votes');
  votesRef.push({
    candidateId: candidateId,
    userId: currentUser.id,
    timestamp: Date.now()
  });
  disableVoting('投票成功，謝謝您！');
}

window.onload = init;
    
