document.addEventListener('DOMContentLoaded', () => {
    const transactionForm = document.getElementById('transactionForm');
    const transactionList = document.getElementById('transactionList');
    const balanceElement = document.getElementById('balance');
    const incomeElement = document.getElementById('income');
    const expenseElement = document.getElementById('expense');
    const statusElement = document.getElementById('status');

    // Fetch and display transactions and balance on page load
    fetchTransactions();
    fetchBalance();

    async function fetchTransactions() {
        try {
            const response = await fetch('/transactions', {
                method: 'GET',
                credentials: 'include' // Important for sending cookies
            });

            if (!response.ok) {
                throw new Error('Failed to fetch transactions');
            }

            const transactions = await response.json();
            updateTransactionList(transactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            statusElement.textContent = 'Failed to load transactions.';
        }
    }

    async function fetchBalance() {
        try {
            const response = await fetch('/balance', {
                method: 'GET',
                credentials: 'include' // Important for sending cookies
            });

            if (!response.ok) {
                throw new Error('Failed to fetch balance');
            }

            const data = await response.json();
            updateBalance(data);
        } catch (error) {
            console.error('Error fetching balance:', error);
            statusElement.textContent = 'Failed to load balance.';
        }
    }

    function updateTransactionList(transactions) {
        transactionList.innerHTML = '';
        transactions.forEach(tx => {
            const listItem = document.createElement('li');
            listItem.textContent = `${tx._date}: ${tx.category} - $${tx.amount.toFixed(2)}`;
            transactionList.appendChild(listItem);
        });
    }

    function updateBalance(data) {
        balanceElement.textContent = `$${data.balance.toFixed(2)}`;
        incomeElement.textContent = `$${data.income.toFixed(2)}`;
        expenseElement.textContent = `$${data.expense.toFixed(2)}`;
    }

    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const typeCheckbox = document.getElementById('type');
        const name = document.getElementById('name').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const date = document.getElementById('date').value;
        const category = typeCheckbox.checked ? 'Income' : 'Expense';

        if (!name || isNaN(amount) || amount <= 0 || !date) {
            statusElement.textContent = 'Please fill in all fields correctly.';
            return;
        }

        try {
            const response = await fetch('/add-expense', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Important for sending cookies
                body: JSON.stringify({ amount, _date: date, category })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to add expense');
            }

            statusElement.textContent = 'Expense added successfully.';
            fetchTransactions(); // Refresh the transaction list
            fetchBalance(); // Refresh the balance
        } catch (error) {
            console.error('Error adding expense:', error);
            statusElement.textContent = 'Failed to add expense.';
        }
    });
});
