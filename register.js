document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const authMsg = document.getElementById('auth-msg');

        try {
            const response = await fetch('/register', {
                method: 'POST', // Uppercase 'POST'
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, username, password })
            });

            if (!response.ok) {
                const data = await response.json(); // Ensure this line is after the check
                authMsg.textContent = data.message || 'Registration failed. Try again.';
            } else {
                authMsg.textContent = 'Access granted.';

                // Redirect to login page
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
        } catch (err) {
            authMsg.textContent = 'An error occurred: ' + err.message;
        }
    });
});
