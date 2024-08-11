document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    const authMsg = document.getElementById('auth-msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                authMsg.textContent = 'Login successful. Redirecting...';

                // Redirect to home page/index.html
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                authMsg.textContent = data.message || 'Login failed. Please try again.';
            }
        } catch (err) {
            authMsg.textContent = 'An error occurred: ' + err.message;
        }
    });
});
