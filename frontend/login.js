/* ================================================
   ข้อมูลผู้ใช้สำรอง (ใช้เฉพาะตอน backend ลง)
   ================================================ */
var fallbackUsers = [
    { username: 'admin', password: 'admin123', name: 'Admin', role: 'admin' },
    { username: 'staff', password: 'staff123', name: 'Staff', role: 'staff' }
];

var API_BASE = 'http://localhost:3000/api';

/* ================================================
   ข้อความภาษา
   ================================================ */
var loginLang = {
    la: {
        subtitle: 'ລະບົບຈັດການຈຸດຂາຍ',
        labelUser: 'ຊື່ຜູ້ໃຊ້',
        labelPass: 'ລະຫັດຜ່ານ',
        remember: 'ຈື່ຂ້ອກັບຂ້ອນ້ອຍ',
        loginBtn: 'ເຂົ້າສູ່ລະບົບ',
        errEmptyUser: 'ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້',
        errEmptyPass: 'ກະລຸນາປ້ອນລະຫັດຜ່ານ',
        errWrong: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານ ບໍ່ຖືກຕ້ອງ',
        errServer: 'ເຊີບເວີບ໌າຍ ກະລຸນລອງໃໝ່',
        placeholderUser: 'ປ້ອນຊື່ຜູ້ໃຊ້...',
        placeholderPass: 'ປ້ອນລະຫັດຜ່ານ...'
    },
    en: {
        subtitle: 'Point of Sale System',
        labelUser: 'Username',
        labelPass: 'Password',
        remember: 'Remember me',
        loginBtn: 'Sign In',
        errEmptyUser: 'Please enter username',
        errEmptyPass: 'Please enter password',
        errWrong: 'Incorrect username or password',
        errServer: 'Server error, please try again',
        placeholderUser: 'Enter username...',
        placeholderPass: 'Enter password...'
    }
};

var currentLoginLang = localStorage.getItem('bb_lang') || 'la';

function lt(key) {
    return (loginLang[currentLoginLang] && loginLang[currentLoginLang][key]) || key;
}

function switchLoginLang(lang) {
    currentLoginLang = lang;
    localStorage.setItem('bb_lang', lang);
    document.querySelectorAll('.login-lang button').forEach(function (b) {
        b.classList.toggle('active', b.dataset.lang === lang);
    });
    updateLoginText();
}

function updateLoginText() {
    document.getElementById('loginSubtitle').textContent = lt('subtitle');
    document.getElementById('labelUser').textContent = lt('labelUser');
    document.getElementById('labelPass').textContent = lt('labelPass');
    document.getElementById('rememberText').textContent = lt('remember');
    document.getElementById('loginBtnText').textContent = lt('loginBtn');
    document.getElementById('username').placeholder = lt('placeholderUser');
    document.getElementById('password').placeholder = lt('placeholderPass');
}

/* ================================================
   แสดง/ซ่อนรหัส
   ================================================ */
function togglePassword() {
    var passField = document.getElementById('password');
    var eyeIcon = document.getElementById('eyeIcon');
    if (passField.type === 'password') {
        passField.type = 'text';
        eyeIcon.className = 'fas fa-eye-slash';
    } else {
        passField.type = 'password';
        eyeIcon.className = 'fas fa-eye';
    }
}

/* ================================================
   แสดง/ซ่อน error
   ================================================ */
function showError(id, text) {
    document.getElementById(id + 'Text').textContent = text;
    document.getElementById(id).classList.add('show');
}

function hideError(id) {
    document.getElementById(id).classList.remove('show');
}

function showAlert(text) {
    var el = document.getElementById('loginAlert');
    document.getElementById('loginAlertText').textContent = text;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 3000);
}

/* ================================================
   จัดการ login — เรียก API จริง มี fallback
   ================================================ */
function handleLogin(e) {
    e.preventDefault();

    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;
    var btn = document.getElementById('loginBtn');
    var valid = true;

    hideError('errorUser');
    hideError('errorPass');
    document.getElementById('loginAlert').classList.remove('show');
    document.getElementById('username').classList.remove('error');
    document.getElementById('password').classList.remove('error');

    if (!username) {
        showError('errorUser', lt('errEmptyUser'));
        document.getElementById('username').classList.add('error');
        valid = false;
    }

    if (!password) {
        showError('errorPass', lt('errEmptyPass'));
        document.getElementById('password').classList.add('error');
        valid = false;
    }

    if (!valid) return;

    btn.classList.add('loading');
    btn.disabled = true;

    // เรียก API จริง
    fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    })
        .then(function (res) {
            if (!res.ok) return res.json();
            return res.json();
        })
        .then(function (data) {
            if (data.error) {
                throw new Error(data.error);
            }

            // บันทึก token และข้อมูล user
            var userData = {
                token: data.token,
                username: data.user.username,
                name: data.user.name,
                role: data.user.role,
                loginTime: new Date().toISOString()
            };

            sessionStorage.setItem('bb_user', JSON.stringify(userData));

            if (document.getElementById('rememberMe').checked) {
                localStorage.setItem('bb_remember', username);
            } else {
                localStorage.removeItem('bb_remember');
            }

            window.location.href = 'index.html';
        })
        .catch(function (err) {
            btn.classList.remove('loading');
            btn.disabled = false;

            // ถ้า API ลง → ใช้ fallback (ข้อมูลในไฟล์)
            if (err.message === 'Failed to fetch') {
                var found = fallbackUsers.find(function (u) {
                    return u.username === username && u.password === password;
                });

                if (found) {
                    sessionStorage.setItem('bb_user', JSON.stringify({
                        token: 'fallback_local',
                        username: found.username,
                        name: found.name,
                        role: found.role,
                        loginTime: new Date().toISOString()
                    }));

                    if (document.getElementById('rememberMe').checked) {
                        localStorage.setItem('bb_remember', username);
                    } else {
                        localStorage.removeItem('bb_remember');
                    }

                    window.location.href = 'index.html';
                    return;
                }
            }

            showAlert(err.message || lt('errWrong'));
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        });
}

/* ================================================
   ลอยเค้กพื้นหลัง
   ================================================ */
(function () {
    var container = document.getElementById('bgCakes');
    var icons = ['🍰', '🎂', '🧁', '🍩', '🍫', '✨', '🧀', '🌿'];
    for (var i = 0; i < 10; i++) {
        var el = document.createElement('div');
        el.className = 'bg-cake';
        el.textContent = icons[Math.floor(Math.random() * icons.length)];
        el.style.left = Math.random() * 100 + '%';
        el.style.animationDuration = (18 + Math.random() * 25) + 's';
        el.style.animationDelay = (-Math.random() * 30) + 's';
        el.style.fontSize = (16 + Math.random() * 18) + 'px';
        container.appendChild(el);
    }
})();

/* ================================================
   เริ่มต้น
   ================================================ */
(function () {
    switchLoginLang(currentLoginLang);

    var remembered = localStorage.getItem('bb_remember');
    if (remembered) {
        document.getElementById('username').value = remembered;
        document.getElementById('rememberMe').checked = true;
        document.getElementById('password').focus();
    } else {
        document.getElementById('username').focus();
    }

    if (sessionStorage.getItem('bb_user')) {
        window.location.href = 'index.html';
    }
})();