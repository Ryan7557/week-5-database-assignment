document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    const authMsg = document.getElementById('auth-msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, username, password })
            });

            const data = await response.json();

            if (response.ok) {
                authMsg.textContent = 'Registration successful. Redirecting...';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            } else {
                authMsg.textContent = data.message || 'Registration failed. Please try again.';
            }
        } catch (err) {
            authMsg.textContent = 'An error occurred: ' + err.message;
        }
    });
});