document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const authMsg = document.getElementById('auth-msg');

        try{
            const response = await fetch('/login', {
                method: 'POST',
                headers:  {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if(!response.ok) {
                authMsg.textContent = data;
            } else {
                authMsg.textContent = data;
            } 
            // redirect to home page/index.html
            setTimeout(() => {
                window.location.href = 'index.html';
            },1000);
        } catch (err) {
            authMsg.textContent = 'An error occured: ' + err.message;
        }
    });
});