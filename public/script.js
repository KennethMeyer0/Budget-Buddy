document.addEventListener("DOMContentLoaded", function () {
  // Get references to DOM elements
  const incomeTransactionList = document.getElementById("income-transaction-history");
  const expenseTransactionList = document.getElementById("expense-transaction-history");
  const totalExpense = document.getElementById("total-expense");
  const totalIncome = document.getElementById("total-income");
  const balance = document.getElementById("balance");
  const budgetGoalInput = document.getElementById("budget-goal");
  const progressBar = document.getElementById("progress");
  const progressText = document.getElementById("progress-text");
  const warningText = document.getElementById("budget-warning");
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  const fileInput = document.getElementById("upload");
  fileInput.addEventListener("change", handleFileUpload);

  // collect current budget data into a JS object
  function gatherBudgetData() {
    const txs = [];
    document.querySelectorAll("#income-transaction-history tr, #expense-transaction-history tr")
      .forEach(row => {
        txs.push({
          description: row.children[0].textContent,
          category:    row.children[1].textContent,
          amount:      row.children[2].textContent,
          type:        row.children[3].getAttribute("data-type")
        });
      });
    return {
      month:         monthSelect.value,
      year:          yearSelect.value,
      totalIncome:   totalIncome.textContent,
      totalExpenses: totalExpense.textContent,
      balance:       balance.textContent,
      budgetGoal:    budgetGoalInput.value || "none",
      transactions:  txs
    };
  }

  // AI21 Jamba
  async function askAI21(prompt) {
    try {
      const res = await fetch("/api/ai21", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (res.ok && data.choices && data.choices.length) {
        return data.choices[0].message.content;
      } else {
        const msg = data.error || JSON.stringify(data);
        throw new Error(msg);
      }
    } catch (err) {
      console.error("askAI21 error:", err);
      alert("AI21 failed: " + err.message);
      return "";
    }
  }

  // Shows custom AI prompt modal only
  document.getElementById("ai-button").addEventListener("click", () => {
    document.getElementById("ai-modal-text").textContent =
      "What do you want to ask your Budget‑Buddy AI?";
    document.getElementById("ai-modal-input").value = "";
    document.getElementById("ai-modal").style.display = "flex";
  });

  // Submit from modal
  document.getElementById("ai-modal-submit").addEventListener("click", async () => {
    const userPrompt = document.getElementById("ai-modal-input").value.trim();
    if (!userPrompt) return;
    document.getElementById("ai-modal").style.display = "none";

    const data       = gatherBudgetData();
    const fullPrompt = "Here is my current budgeting data in JSON:\n" +
                       JSON.stringify(data, null, 2) +
                       "\n\nQuestion: " + userPrompt;

    const aiResponse = await askAI21(fullPrompt);
    if (aiResponse) {
      document.getElementById("ai-response").textContent = aiResponse;
    }
  });

  // Cancel or close modal
  document.getElementById("ai-modal-cancel").addEventListener("click", () => {
    document.getElementById("ai-modal").style.display = "none";
  });
  document.querySelector(".close-button").addEventListener("click", () => {
    document.getElementById("ai-modal").style.display = "none";
  });

  let budgetGoal = 0;
  let currentMode = "login"; // "login" or "create"

  // Restore last selected month/year if available
  const lastMonth = localStorage.getItem("budgetBuddyLastMonth");
  const lastYear  = localStorage.getItem("budgetBuddyLastYear");
  if (lastMonth) monthSelect.value = lastMonth;
  if (lastYear)  yearSelect.value  = lastYear;

  // Save current month/year selection
  function saveMonthYearSelection() {
    localStorage.setItem("budgetBuddyLastMonth", monthSelect.value);
    localStorage.setItem("budgetBuddyLastYear",  yearSelect.value);
  }

  // Initialize Pie Chart
  const ctxPie = document.getElementById("incomeExpenseChart").getContext("2d");
  const expenseData = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
    }],
  };
  const incomeExpenseChart = new Chart(ctxPie, {
    type: "pie",
    data: expenseData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" }
      }
    }
  });

  // Initialize Bar Chart with updated title and legend
  const ctxBar = document.getElementById("barChart").getContext("2d");
  let barChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expense', 'Balance'],
      datasets: [{
        label: '',
        data: [0, 0, 0],
        backgroundColor: [
          'rgba(0, 123, 255, 0.7)',
          'rgba(220, 53, 69, 0.7)',
          'rgba(40, 167, 69, 0.7)'
        ],
        borderColor: [
          'rgba(0, 123, 255, 1)',
          'rgba(220, 53, 69, 1)',
          'rgba(40, 167, 69, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            generateLabels: function(chart) {
              const dataset = chart.data.datasets[0];
              return chart.data.labels.map((label, index) => {
                return {
                  text: label,
                  fillStyle: dataset.backgroundColor[index],
                  strokeStyle: dataset.borderColor[index],
                  lineWidth: 1,
                  hidden: isNaN(dataset.data[index]),
                  index: index
                };
              });
            },
            font: { size: 14 }
          }
        },
        title: {
          display: true,
          text: 'Budget Summary Chart',
          font: { size: 16 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 12 } }
        },
        x: {
          ticks: { font: { size: 12 } }
        }
      }
    }
  });

  // Update bar chart based on summary values
  function updateBarChart() {
    const income = parseFloat(totalIncome.textContent.replace('$','')) || 0;
    const expense = parseFloat(totalExpense.textContent.replace('$','')) || 0;
    const bal = parseFloat(balance.textContent.replace('$','')) || 0;
    barChart.data.datasets[0].data = [income, expense, bal];
    barChart.update();
  }

  function getBudgetDataKey() {
    const currentUser = localStorage.getItem("budgetBuddyCurrentUser");
    return "budgetBuddyData_" + currentUser + "_" + monthSelect.value + "_" + yearSelect.value;
  }

  // When month or year changes, clears current data and save selection
  function handleMonthYearChange() {
    incomeTransactionList.innerHTML = "";
    expenseTransactionList.innerHTML = "";
    budgetGoalInput.value = "";
    budgetGoalInput.disabled = false;
    fileInput.value = "";
    updateSummary();
    updateProgress();
    clearPieChart();
    saveMonthYearSelection();
    loadBudgetData();
  }
  monthSelect.addEventListener("change", handleMonthYearChange);
  yearSelect.addEventListener("change", handleMonthYearChange);

  function generateColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // Clear the pie chart data
  function clearPieChart() {
    expenseData.labels = [];
    expenseData.datasets[0].data = [];
    expenseData.datasets[0].backgroundColor = [];
    incomeExpenseChart.update();
  }

  // Recalculate pie chart from expense transactions
  function recalcPieChart() {
    expenseData.labels = [];
    expenseData.datasets[0].data = [];
    expenseData.datasets[0].backgroundColor = [];
    document.querySelectorAll("#expense-transaction-history tr").forEach((row) => {
      const category = row.children[1].textContent;
      const amount = parseFloat(row.children[2].textContent);
      let idx = expenseData.labels.indexOf(category);
      if (idx === -1) {
        expenseData.labels.push(category);
        expenseData.datasets[0].data.push(amount);
        expenseData.datasets[0].backgroundColor.push(generateColor());
      } else {
        expenseData.datasets[0].data[idx] += amount;
      }
    });
    incomeExpenseChart.update();
  }

  function lockBudget() {
    const inputValue = parseFloat(budgetGoalInput.value);
    if (isNaN(inputValue) || inputValue <= 0) {
      alert("Please enter a valid budget goal.");
      return;
    }
    budgetGoal = inputValue;
    budgetGoalInput.disabled = true;
    alert(`Budget goal of $${budgetGoal.toFixed(2)} is now locked.`);
    warningText.style.display = "none";
    updateProgress();
    saveBudgetData();
  }

  function addIncome() {
    const category = document.getElementById("income-category").value.trim() || "Income";
    const description = document.getElementById("income-description").value.trim();
    const amount = parseFloat(document.getElementById("income-amount").value);
    if (!category || !description || isNaN(amount) || amount <= 0) {
      alert("Please enter valid income details.");
      return;
    }
    addTransaction(description, amount, category, "Income");
    clearInputs("income");
    updateSummary();
    updateProgress();
    updateBarChart();
    saveBudgetData();
  }

  function addExpense() {
    const category = document.getElementById("expense-category").value.trim();
    const description = document.getElementById("expense-description").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value);
    if (!category || !description || isNaN(amount) || amount <= 0) {
      alert("Please enter valid expense details.");
      return;
    }
    addTransaction(description, amount, category, "Expense");
    clearInputs("expense");
    updateSummary();
    updateProgress();
    recalcPieChart();
    updateBarChart();
    saveBudgetData();
  }

  function addTransaction(description, amount, category, type) {
    const transactionRow = document.createElement("tr");
    transactionRow.innerHTML = `
      <td>${description}</td>
      <td>${category}</td>
      <td>${amount.toFixed(2)}</td>
      <td data-type="${type}">
        <div class="action-buttons">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      </td>
    `;
    if (type === "Income") {
      incomeTransactionList.appendChild(transactionRow);
    } else if (type === "Expense") {
      expenseTransactionList.appendChild(transactionRow);
      recalcPieChart();
    }
    transactionRow.querySelector(".delete-btn").addEventListener("click", function () {
      transactionRow.remove();
      updateSummary();
      if (type === "Expense") {
        recalcPieChart();
      }
      updateProgress();
      updateBarChart();
      saveBudgetData();
    });
    transactionRow.querySelector(".edit-btn").addEventListener("click", function () {
      enableInlineEditing(transactionRow, type);
    });
    saveBudgetData();
  }

  function clearInputs(type) {
    if (type === "income") {
      document.getElementById("income-category").value = "";
      document.getElementById("income-description").value = "";
      document.getElementById("income-amount").value = "";
    } else if (type === "expense") {
      document.getElementById("expense-category").value = "";
      document.getElementById("expense-description").value = "";
      document.getElementById("expense-amount").value = "";
    }
  }

  function deleteBudget() {
    budgetGoalInput.disabled = false;
    budgetGoalInput.value = "";
    progressBar.style.width = "0%";
    progressText.textContent = "Progress: 0%";
    warningText.style.display = "none";
    alert("Budget goal has been deleted.");
    saveBudgetData();
  }

  function enableInlineEditing(transactionRow, type) {
    transactionRow.classList.add("editing");
    const description = transactionRow.children[0].textContent;
    const category = transactionRow.children[1].textContent;
    const amount = parseFloat(transactionRow.children[2].textContent);
    transactionRow.innerHTML = `
      <td><input type="text" value="${description}" class="edit-input"></td>
      <td><input type="text" value="${category}" class="edit-input"></td>
      <td><input type="number" value="${amount}" class="edit-input"></td>
      <td data-type="${type}">
        <div class="action-buttons">
          <button class="save-btn">Save</button>
          <button class="cancel-btn">Cancel</button>
        </div>
      </td>
    `;
    transactionRow.querySelector(".save-btn").addEventListener("click", function () {
      saveTransaction(transactionRow, type);
    });
    transactionRow.querySelector(".cancel-btn").addEventListener("click", function () {
      cancelEdit(transactionRow, description, category, amount, type);
    });
  }

  function saveTransaction(transactionRow, type) {
    const descriptionInput = transactionRow.children[0].querySelector("input").value.trim();
    const categoryInput = transactionRow.children[1].querySelector("input").value.trim();
    const amountInput = parseFloat(transactionRow.children[2].querySelector("input").value);
    if (!descriptionInput || !categoryInput || isNaN(amountInput) || amountInput <= 0) {
      alert("Please enter valid transaction details.");
      return;
    }
    transactionRow.classList.remove("editing");
    transactionRow.innerHTML = `
      <td>${descriptionInput}</td>
      <td>${categoryInput}</td>
      <td>${amountInput.toFixed(2)}</td>
      <td data-type="${type}">
        <div class="action-buttons">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      </td>
    `;
    transactionRow.querySelector(".edit-btn").addEventListener("click", function () {
      enableInlineEditing(transactionRow, type);
    });
    transactionRow.querySelector(".delete-btn").addEventListener("click", function () {
      transactionRow.remove();
      updateSummary();
      if (type === "Expense") {
        recalcPieChart();
      }
      updateProgress();
      updateBarChart();
      saveBudgetData();
    });
    updateSummary();
    updateProgress();
    if (type === "Expense") {
      recalcPieChart();
    }
    updateBarChart();
    saveBudgetData();
  }

  function cancelEdit(transactionRow, oldDescription, oldCategory, oldAmount, type) {
    transactionRow.classList.remove("editing");
    transactionRow.innerHTML = `
      <td>${oldDescription}</td>
      <td>${oldCategory}</td>
      <td>${oldAmount.toFixed(2)}</td>
      <td data-type="${type}">
        <div class="action-buttons">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      </td>
    `;
    transactionRow.querySelector(".edit-btn").addEventListener("click", function () {
      enableInlineEditing(transactionRow, type);
    });
    transactionRow.querySelector(".delete-btn").addEventListener("click", function () {
      transactionRow.remove();
      updateSummary();
      if (type === "Expense") {
        recalcPieChart();
      }
      updateProgress();
      updateBarChart();
      saveBudgetData();
    });
  }

  function updateSummary() {
    let totalIncomes = 0;
    let totalExpenses = 0;
    document.querySelectorAll("#income-transaction-history tr, #expense-transaction-history tr").forEach((row) => {
      const amount = parseFloat(row.children[2].textContent);
      const type = row.children[3].getAttribute("data-type");
      if (type === "Income") {
        totalIncomes += amount;
      } else if (type === "Expense") {
        totalExpenses += amount;
      }
    });
    totalIncome.textContent = `$${totalIncomes.toFixed(2)}`;
    totalExpense.textContent = `$${totalExpenses.toFixed(2)}`;
    balance.textContent = `$${(totalIncomes - totalExpenses).toFixed(2)}`;
    updateBarChart();
  }

  function updateProgress() {
    const budgetGoalValue = parseFloat(budgetGoalInput.value) || 0;
    const totalExpenses = parseFloat(totalExpense.textContent.replace('$','')) || 0;
    if (budgetGoalValue === 0) {
      progressBar.style.width = "0%";
      progressBar.style.backgroundColor = "#28a745";
      progressText.textContent = "Progress: 0%";
      warningText.style.display = "none";
      return;
    }
    const progressPercentage = Math.min((totalExpenses / budgetGoalValue) * 100, 100);
    progressBar.style.width = `${progressPercentage}%`;
    if (progressPercentage >= 80) {
      progressBar.style.backgroundColor = "#dc3545";
      warningText.style.display = "block";
    } else if (progressPercentage >= 50) {
      progressBar.style.backgroundColor = "#ffc107";
      warningText.style.display = "none";
    } else {
      progressBar.style.backgroundColor = "#28a745";
      warningText.style.display = "none";
    }
    progressText.textContent = `Progress: ${progressPercentage.toFixed(2)}%`;
  }

  function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Budget-Buddy Report", pageWidth / 2, 15, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    let startY = 25;
    doc.setFont("helvetica", "bold");
    doc.text("Income Transactions", 10, startY);
    doc.setFont("helvetica", "normal");
    startY += 7;
    const fixedColumnStyles = {
      0: { cellWidth: 70, halign: 'left' },
      1: { cellWidth: 60, halign: 'left' },
      2: { cellWidth: 40, halign: 'left' }
    };
    const incomeRows = [];
    document.querySelectorAll("#income-transaction-history tr").forEach((row) => {
      const description = row.children[0].textContent;
      const category = row.children[1].textContent;
      const amount = row.children[2].textContent;
      incomeRows.push([description, category, `$${amount}`]);
    });
    if (incomeRows.length > 0) {
      doc.autoTable({
        startY: startY,
        head: [["Description", "Category", "Amount"]],
        body: incomeRows,
        theme: 'grid',
        headStyles: { fillColor: [0, 123, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        columnStyles: fixedColumnStyles
      });
      startY = doc.lastAutoTable.finalY + 10;
    } else {
      doc.text("No income transactions available.", 10, startY);
      startY += 10;
    }
    doc.setFont("helvetica", "bold");
    doc.text("Expense Transactions", 10, startY);
    doc.setFont("helvetica", "normal");
    startY += 7;
    const expenseRows = [];
    document.querySelectorAll("#expense-transaction-history tr").forEach((row) => {
      const description = row.children[0].textContent;
      const category = row.children[1].textContent;
      const amount = row.children[2].textContent;
      expenseRows.push([description, category, `$${amount}`]);
    });
    if (expenseRows.length > 0) {
      doc.autoTable({
        startY: startY,
        head: [["Description", "Category", "Amount"]],
        body: expenseRows,
        theme: 'grid',
        headStyles: { fillColor: [220, 53, 69] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        columnStyles: fixedColumnStyles
      });
      startY = doc.lastAutoTable.finalY + 10;
    } else {
      doc.text("No expense transactions available.", 10, startY);
      startY += 10;
    }
    doc.autoTable({
      startY: startY,
      head: [["Total Income", "Total Expenses", "Balance"]],
      body: [[totalIncome.textContent, totalExpense.textContent, balance.textContent]],
      theme: 'plain',
      styles: { cellPadding: 2 },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'left' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 2) {
          let bal = parseFloat(balance.textContent.replace('$',''));
          data.cell.styles.textColor = bal >= 0 ? [0, 128, 0] : [255, 0, 0];
          data.cell.styles.fontStyle = "bold";
        }
      }
    });
    const fileName = `${monthSelect.value}_${yearSelect.value}_Budget-Buddy_Report.pdf`;
    doc.save(fileName);
  }

  function updatePieChart(category, amount) {
    const categoryIndex = expenseData.labels.indexOf(category);
    if (categoryIndex === -1) {
      expenseData.labels.push(category);
      expenseData.datasets[0].data.push(amount);
      expenseData.datasets[0].backgroundColor.push(generateColor());
    } else {
      expenseData.datasets[0].data[categoryIndex] += amount;
    }
    incomeExpenseChart.update();
  }

  function updatePieChartAfterDeletion(category, amount) {
    const categoryIndex = expenseData.labels.indexOf(category);
    if (categoryIndex !== -1) {
      expenseData.datasets[0].data[categoryIndex] -= amount;
      if (expenseData.datasets[0].data[categoryIndex] <= 0) {
        expenseData.labels.splice(categoryIndex, 1);
        expenseData.datasets[0].data.splice(categoryIndex, 1);
        expenseData.datasets[0].backgroundColor.splice(categoryIndex, 1);
      }
    }
    if (expenseData.datasets[0].data.length === 0) {
      clearPieChart();
    } else {
      incomeExpenseChart.update();
    }
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      populateData(sheetData);
    };
    reader.readAsArrayBuffer(file);
  }

  function populateData(data) {
    data.forEach((row) => {
      const { Description, Category, Amount, Type } = row;
      if (Type === "Income") {
        addTransaction(Description, parseFloat(Amount), Category, "Income");
      } else if (Type === "Expense") {
        addTransaction(Description, parseFloat(Amount), Category, "Expense");
      }
    });
    updateSummary();
    updateProgress();
    recalcPieChart();
    saveBudgetData();
  }

  function exportToExcel() {
    const rows = [];
    rows.push(["Description", "Category", "Amount", "Type"]);
    document.querySelectorAll("#income-transaction-history tr, #expense-transaction-history tr").forEach((row) => {
      const description = row.children[0].textContent;
      const category = row.children[1].textContent;
      const amount = row.children[2].textContent;
      const type = row.children[3].getAttribute("data-type");
      rows.push([description, category, amount, type]);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    const fileName = `${monthSelect.value}_${yearSelect.value}_Budget-Buddy_Report.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  window.login = function() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!username || !password) {
      alert("Please enter username and password.");
      return;
    }
    let users = JSON.parse(localStorage.getItem("budgetBuddyUsers") || "{}");
    if (!(username in users)) {
      alert("User does not exist. Please create an account.");
      return;
    }
    if (users[username] !== password) {
      alert("Incorrect password.");
      return;
    }
    localStorage.setItem("budgetBuddyCurrentUser", username);
    // Hides the entire login page so that the title and welcome message do not appear in the main UI
    document.getElementById("login-wrapper").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    loadBudgetData();
  };

  window.createUser = function() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!username || !password) {
      alert("Please enter username and password.");
      return;
    }
    let users = JSON.parse(localStorage.getItem("budgetBuddyUsers") || "{}");
    if (username in users) {
      alert("User already exists. Please log in.");
      return;
    }
    users[username] = password;
    localStorage.setItem("budgetBuddyUsers", JSON.stringify(users));
    localStorage.setItem("budgetBuddyCurrentUser", username);
    // Set current month and year for new user based on today's date
    const currentDate = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    monthSelect.value = monthNames[currentDate.getMonth()];
    yearSelect.value = currentDate.getFullYear().toString();
    saveMonthYearSelection();

    document.getElementById("login-wrapper").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    loadBudgetData();
  };

  window.logout = function() {
    localStorage.removeItem("budgetBuddyCurrentUser");
    location.reload();
  };

  window.toggleLoginMode = function() {
    const header = document.getElementById("login-header");
    const loginButton = document.getElementById("login-button");
    const toggleText = document.getElementById("toggle-login-mode");
    if (currentMode === "login") {
      currentMode = "create";
      header.textContent = "Create Account";
      loginButton.textContent = "Create Account";
      loginButton.setAttribute("onclick", "createUser()");
      toggleText.innerHTML = 'Already have an account? <a href="#" onclick="toggleLoginMode()">Log In</a>';
    } else {
      currentMode = "login";
      header.textContent = "Login";
      loginButton.textContent = "Login";
      loginButton.setAttribute("onclick", "login()");
      toggleText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleLoginMode()">Create Account</a>';
    }
  };

  function saveBudgetData() {
    const currentUser = localStorage.getItem("budgetBuddyCurrentUser");
    if (!currentUser) return;
    let transactions = [];
    document.querySelectorAll("#income-transaction-history tr, #expense-transaction-history tr").forEach(function(row) {
      let transaction = {
        description: row.children[0].textContent,
        category: row.children[1].textContent,
        amount: row.children[2].textContent,
        type: row.children[3].getAttribute("data-type")
      };
      transactions.push(transaction);
    });
    let data = {
      transactions: transactions,
      budgetGoal: parseFloat(budgetGoalInput.value) || 0
    };
    localStorage.setItem(getBudgetDataKey(), JSON.stringify(data));
  }

  function loadBudgetData() {
    const currentUser = localStorage.getItem("budgetBuddyCurrentUser");
    if (!currentUser) return;
    let data = localStorage.getItem(getBudgetDataKey());
    if (data) {
      let parsedData = JSON.parse(data);
      if (parsedData.budgetGoal && parsedData.budgetGoal > 0) {
        budgetGoal = parsedData.budgetGoal;
        budgetGoalInput.value = parsedData.budgetGoal;
        budgetGoalInput.disabled = true;
      } else {
        budgetGoalInput.value = "";
        budgetGoalInput.disabled = false;
      }
      incomeTransactionList.innerHTML = "";
      expenseTransactionList.innerHTML = "";
      parsedData.transactions.forEach(function(tran) {
        addTransaction(tran.description, parseFloat(tran.amount), tran.category, tran.type);
      });
      updateSummary();
      updateProgress();
      recalcPieChart();
    } else {
      incomeTransactionList.innerHTML = "";
      expenseTransactionList.innerHTML = "";
      budgetGoalInput.value = "";
      budgetGoalInput.disabled = false;
      updateSummary();
      updateProgress();
      clearPieChart();
    }
  }

  let currentUser = localStorage.getItem("budgetBuddyCurrentUser");
  if (currentUser) {
    document.getElementById("login-wrapper").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    loadBudgetData();
  }

  window.addIncome       = addIncome;
  window.addExpense      = addExpense;
  window.lockBudget      = lockBudget;
  window.generatePDF     = generatePDF;
  window.deleteBudget    = deleteBudget;
  window.exportToExcel   = exportToExcel;

});