


  
  import { 
    initializeApp 
  } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
  import { OAuthProvider } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js";
 
  import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    sendPasswordResetEmail, 
    sendEmailVerification,
    EmailAuthProvider,
    reauthenticateWithCredential,
    deleteUser
  } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js";
  
  import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
  } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";
  
  // Fetch the API key securely from the Firebase Cloud Function
  const fetchApiKey = async () => {
    try {
      const response = await fetch("https://getapikey-ahmnn5lmka-uc.a.run.app/");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.apiKey;
    } catch (error) {
      console.error("Error fetching API key:", error);
    }
  };
  // Make them global
// Global variables
let auth;
let db;
let storage; // Declare storage here as a global variable

  // Initialize Firebase with dynamically fetched API key
  const initializeAppWithApiKey = async () => {
    const apiKey = await fetchApiKey();
    if (apiKey) {
      const firebaseConfig = {
        apiKey,
        authDomain: "budgetapp-5d500.firebaseapp.com",
        projectId: "budgetapp-5d500",
        storageBucket: "budgetapp-5d500.appspot.com",
        messagingSenderId: "31114956560",
        appId: "1:31114956560:web:1cbf62fbeaa484114ddf95",
        measurementId: "G-X9P0P9FC43",
      };
  
      const app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      document.getElementById("forgot-password-button").addEventListener("click", async () => {
        const email = document.getElementById("auth-email").value;
      
        if (!email) {
          alert("Please enter your email address.");
          return;
        }
      
        const auth = getAuth();
      
        try {
          await sendPasswordResetEmail(auth, email);
          alert("Password reset email sent! Please check your inbox.");
        } catch (error) {
          console.error("Error resetting password:", error.message);
          alert("Failed to send password reset email. Please try again.");
        }
      });
      
      initializeFirebaseFeatures(app);
      
    } else {
      console.error("Failed to fetch API key. Firebase initialization aborted.");
    }
  };
  function buildDailyNetBalanceSeries(incomes = [], expenses = []) {
    // 1) Build a map: dayString -> totalChange
    //    Example dayString: "2023-03-09"
    const dayMap = {};
  
    // Helper to format a date to "YYYY-MM-DD"
    function formatDay(dateObj) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  
    // Go through incomes (positive amounts)
    incomes.forEach(inc => {
      const dateObj = new Date(inc.timestamp);
      const dayStr = formatDay(dateObj);
      const amount = parseFloat(inc.amount);
      if (!dayMap[dayStr]) dayMap[dayStr] = 0;
      dayMap[dayStr] += amount;
    });
  
    // Go through expenses (negative amounts)
    expenses.forEach(exp => {
      const dateObj = new Date(exp.timestamp);
      const dayStr = formatDay(dateObj);
      const amount = -parseFloat(exp.amount);
      if (!dayMap[dayStr]) dayMap[dayStr] = 0;
      dayMap[dayStr] += amount;
    });
  
    // 2) Convert the dayMap into an array of { date: Date, totalChange: number }
    //    and sort by date ascending.
    let dayEntries = Object.keys(dayMap).map(dayStr => {
      // Rebuild a Date object from dayStr
      // (the time will be midnight for that day)
      const [yyyy, mm, dd] = dayStr.split("-");
      const dateObj = new Date(yyyy, mm - 1, dd);
      return {
        date: dateObj,
        totalChange: dayMap[dayStr]
      };
    });
    dayEntries.sort((a, b) => a.date - b.date);
  
    // 3) Build a running total so the chart can show net balance over time
    let runningTotal = 0;
    const series = dayEntries.map(entry => {
      runningTotal += entry.totalChange;
      return {
        x: entry.date, // ApexCharts will treat this as the date on the x-axis
        y: runningTotal
      };
    });
  
    return series;
  }
  
  ///////////////////////////////////////////////////
  // BEGIN: New Category Selection Code (with Firestore)
  // Supports separate Expense & Income categories in the overlay
  ///////////////////////////////////////////////////
  
  // Global arrays for the user's categories by type
  let expenseCategories = [];
  let incomeCategories = [];
  
  // The list of all available icon filenames
 // The list of all available icon filenames
const ICON_FILES = [
  "airplane.png",
  "bank.png",
  "barber-shop.png",
  "bill (1).png",
  "bills.png",
  "books.png",
  "car.png",
  "child.png",
  "coffee-cup.png",
  "computer.png",
  "computer1.png",
  "contactless.png",
  "cryptocurrency.png",
  "dining.png",
  "drinks.png",
  "education.png",
  "entertainment.png",
  "freelance.png",
  "gas-station.png",
  "gifts.png",
  "groceries.png",
  "gym.png",
  "insurance.png",
  "investments.png",
  "life-insurance.png",
  "love.png",
  "mortgage-loan.png",
  "netflix.png",
  "online-shopping.png",
  "pet.png",
  "prevention.png",
  "rent-income.png",
  "rewinding.png",
  "salary.png",
  "settings.png",
  "shopping.png",
  "smartphone.png",
  "smartphone1.png",
  "subscription.png",
  "taxes.png",
  "television.png",
  "track.png",
  "transit.png",
  "uber.png",
  "water.png",
  "wifi.png"
];

// Default expense categories (reference whichever icons make sense)
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Groceries",       icon: "groceries.png"       },
  { name: "Rent",            icon: "bills.png"           },
  { name: "Dining",          icon: "dining.png"          },
  { name: "Shopping",        icon: "shopping.png"        },
  { name: "Online Shopping", icon: "online-shopping.png" },
  { name: "Transit",         icon: "transit.png"         },
  { name: "Entertainment",   icon: "entertainment.png"   },
  { name: "Coffee",          icon: "coffee-cup.png"      },
  { name: "Gas Station",     icon: "gas-station.png"     },
  { name: "Car",             icon: "car.png"             },
  { name: "Uber",            icon: "uber.png"            },
  { name: "Water",           icon: "water.png"           },
  { name: "Insurance",       icon: "insurance.png"       },
  { name: "Life Insurance",  icon: "life-insurance.png"  },
  { name: "Mortgage",        icon: "mortgage-loan.png"   },
  { name: "Taxes",           icon: "taxes.png"           },
  { name: "Pet",             icon: "pet.png"             },
  { name: "Child",           icon: "child.png"           },
  { name: "Gym",             icon: "gym.png"             },
  { name: "Drinks",          icon: "drinks.png"          }
];

// Default income categories
const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary",       icon: "salary.png"        },
  { name: "Freelance",    icon: "freelance.png"     },
  { name: "Investments",  icon: "investments.png"   },
  { name: "Gifts",        icon: "gifts.png"         },
  { name: "Rent Income",  icon: "rent-income.png"   },
  { name: "Bank",         icon: "bank.png"          }
];


  // Default category type is "expense"
  let currentCategoryType = "expense";
  
  // ------------------------------
  // DOM REFERENCES
  // ------------------------------
  
  // Transaction popup elements (for when a category is selected)
  const crSelectIncomeCategoryBtn = document.getElementById("cr-select-income-category-btn");
  const crSelectExpenseCategoryBtn = document.getElementById("cr-select-expense-category-btn");
  const crChosenIncomeCategory = document.getElementById("cr-chosen-income-category");
  const crChosenIncomeCategoryText = document.getElementById("cr-chosen-income-category-text");
  const crChosenExpenseCategory = document.getElementById("cr-chosen-expense-category");
  const crChosenExpenseCategoryText = document.getElementById("cr-chosen-expense-category-text");
  // near your other DOM references:
const crShowAddCatForm = document.getElementById("cr-show-add-cat-form");
const crAddCatForm = document.getElementById("cr-add-cat-form");

  // Category overlay (popup) elements
  const crCategoryOverlay = document.getElementById("cr-category-overlay");
  const crCloseCategoryPopup = document.getElementById("cr-close-category-popup");
  const crCategoryList = document.getElementById("cr-category-list");

  const crNewCatName = document.getElementById("cr-new-cat-name");
  const crIconBgColor = document.getElementById("cr-icon-bgcolor");

  const crIconsGrid = document.getElementById("cr-icons-grid");
  const crSaveNewCatBtn = document.getElementById("cr-save-new-cat-btn");
  
  // Category overlay tabs (for switching between Expense and Income)
  // These IDs are unique for the overlay and do not conflict with the transaction popup toggles.
  const crCatExpenseTab = document.getElementById("cr-cat-expense-tab");
  const crCatIncomeTab = document.getElementById("cr-cat-income-tab");
  
  // Keep track of the icon chosen in the add-new form
  let selectedBgColor = "#ffffff"; // or some default
let selectedIcon = "";

  /**
   * Load categories from Firestore into our local arrays.
   */
  async function loadCategoriesFromFirestore(user) {
    if (!user) return;
    console.log("Loading categories from Firestore for user:", user.uid);
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      expenseCategories = Array.isArray(data.expenseCategories) ? data.expenseCategories : [];
      incomeCategories = Array.isArray(data.incomeCategories) ? data.incomeCategories : [];
    } else {
      console.log("No user doc; creating with empty category arrays...");
      await setDoc(userDocRef, { expenseCategories: [], incomeCategories: [] }, { merge: true });
      expenseCategories = [];
      incomeCategories = [];
    }
    console.log("Loaded expense categories:", expenseCategories);
    console.log("Loaded income categories:", incomeCategories);
    renderCategoryList();
  }
  
  /**
   * Save the current type's categories to Firestore, then reload.
   */
  async function saveCategoriesToFirestore() {
    const user = auth.currentUser;
    if (!user) {
      alert("No user is logged in.");
      return;
    }
    const userDocRef = doc(db, "users", user.uid);
    if (currentCategoryType === "expense") {
      console.log("Saving expense categories:", expenseCategories);
      await setDoc(userDocRef, { expenseCategories }, { merge: true });
    } else {
      console.log("Saving income categories:", incomeCategories);
      await setDoc(userDocRef, { incomeCategories }, { merge: true });
    }
    await loadCategoriesFromFirestore(user);
  }
  document.addEventListener("DOMContentLoaded", () => {
    const colorCircles = document.querySelectorAll('.color-circle');
    colorCircles.forEach(circle => {
      // each circle has a data-color attribute
      const colorVal = circle.dataset.color || '#fff';
      circle.style.backgroundColor = colorVal;
  
      circle.addEventListener("click", () => {
        // Clear existing borders (so only one circle is selected)
        colorCircles.forEach(c => c.style.borderColor = 'transparent');
        // Highlight the clicked circle
        circle.style.borderColor = '#4caf50';
  
        // Save the color in our global variable
        selectedBgColor = colorVal;
  
        // If you have a “preview icon” up top:
        const previewIconEl = document.querySelector('.preview-icon');
        if (previewIconEl) {
          previewIconEl.style.backgroundColor = colorVal;
        }
      });
    });
  });
  
  
  
  
  /**
   * Render the category list in the overlay popup based on currentCategoryType.
   */
 /**
 * Render the category list in the overlay popup based on currentCategoryType.
 */
 function renderCategoryList() {
  console.log("Rendering categories for type:", currentCategoryType);
  crCategoryList.innerHTML = "";

  // Decide which list (income or expense) to show
  const list = (currentCategoryType === "expense") ? expenseCategories : incomeCategories;

  list.forEach(cat => {
    const card = document.createElement("div");
    card.className = "category-card";

    // Build the icon circle + name
    card.innerHTML = `
    <div class="icon-circle"
         style="background-color: ${cat.bgColor || '#eee'};">
       <img src="./icons/${cat.icon}" alt="${cat.name}">
    </div>
    <div>${cat.name}</div>
  `;
  

    // On click, highlight the chosen category
    card.addEventListener("click", () => {
      // Remove 'selected' class from all category cards
      crCategoryList.querySelectorAll(".category-card")
        .forEach(c => c.classList.remove("selected"));

      // Highlight this card
      card.classList.add("selected");

      // Update hidden input / text (income or expense)
      if (currentCategoryType === "income") {
        crChosenIncomeCategory.value = cat.name;
        crChosenIncomeCategoryText.textContent = cat.name;
      } else {
        crChosenExpenseCategory.value = cat.name;
        crChosenExpenseCategoryText.textContent = cat.name;
      }
      console.log(`Selected ${currentCategoryType} category: "${cat.name}"`);

      // Automatically close the overlay
      crCategoryOverlay.classList.add("hidden");
    });

    // Add the card to the category list container
    crCategoryList.appendChild(card);
  });
}

    
 // Show the full-screen form when user clicks "+"
crShowAddCatForm.addEventListener("click", () => {
  crAddCatForm.classList.remove("hidden");

  crNewCatName.value = "";
  selectedIcon = "";
  if (crIconBgColor) crIconBgColor.value = "#ffffff";
  crIconsGrid.innerHTML = "";
  renderIconsGrid();
});

// Close the full-screen form when user clicks the "X"
const crCloseAddCatForm = document.getElementById("cr-close-add-cat-form");
crCloseAddCatForm.addEventListener("click", () => {
  crAddCatForm.classList.add("hidden");
});


  
  /**
   * Render the icons grid in the add-new category form.
   */
  function renderIconsGrid() {
    crIconsGrid.innerHTML = "";
    ICON_FILES.forEach(iconFile => {
      const btn = document.createElement("button");
      btn.innerHTML = `<img src="./icons/${iconFile}" alt="${iconFile}" />`;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        // remove highlight from others
        crIconsGrid.querySelectorAll("button").forEach(b => b.classList.remove("selected-icon"));
        btn.classList.add("selected-icon");
  
        selectedIcon = iconFile;
  
        // If you have a preview image element
        const previewImg = document.getElementById("cat-preview-img");
        if (previewImg) {
          previewImg.src = `./icons/${iconFile}`;
        }
      });
      crIconsGrid.appendChild(btn);
    });
  }
  
  
  
  /***************************************************
    EVENT LISTENERS
  ****************************************************/
  
  // Opening the category overlay from the transaction popup:
  crSelectIncomeCategoryBtn.addEventListener("click", () => {
    currentCategoryType = "income";
    crCategoryOverlay.classList.remove("hidden");
    crAddCatForm.classList.add("hidden");
    // Set the overlay tabs' active styling
    crCatIncomeTab.classList.add("active");
    crCatExpenseTab.classList.remove("active");
    renderCategoryList();
  });
  
  crSelectExpenseCategoryBtn.addEventListener("click", () => {
    currentCategoryType = "expense";
    crCategoryOverlay.classList.remove("hidden");
    crAddCatForm.classList.add("hidden");
    crCatExpenseTab.classList.add("active");
    crCatIncomeTab.classList.remove("active");
    renderCategoryList();
  });
  
  // Tab switching within the category overlay:
  crCatExpenseTab.addEventListener("click", () => {
    currentCategoryType = "expense";
    crCatExpenseTab.classList.add("active");
    crCatIncomeTab.classList.remove("active");
    renderCategoryList();
  });
  
  crCatIncomeTab.addEventListener("click", () => {
    currentCategoryType = "income";
    crCatIncomeTab.classList.add("active");
    crCatExpenseTab.classList.remove("active");
    renderCategoryList();
  });
  
  // Close the category overlay:
  crCloseCategoryPopup.addEventListener("click", () => {
    crCategoryOverlay.classList.add("hidden");
  });
  

  /***************************************************
  SAVE A NEW CATEGORY (with background color)
****************************************************/
crSaveNewCatBtn.addEventListener("click", async () => {
  // Validate
  const newName = crNewCatName.value.trim();
  if (!newName) {
    alert("Please enter a category name!");
    return;
  }
  if (!selectedIcon) {
    alert("Please choose an icon!");
    return;
  }

  // Construct the category object
  const newCategory = {
    name: newName,
    icon: selectedIcon,
    bgColor: selectedBgColor  // <--- store the color
  };

  // Push it into expenseCategories or incomeCategories
  if (currentCategoryType === "expense") {
    expenseCategories.push(newCategory);
  } else {
    incomeCategories.push(newCategory);
  }

  // Save to Firestore
  await saveCategoriesToFirestore();

  // Reset form fields & re-render
  crNewCatName.value = "";
  selectedIcon = "";
  selectedBgColor = "#ffffff";
  crIconsGrid.innerHTML = "";
  renderIconsGrid();
  renderCategoryList();

  // Hide the "Add New Category" popup and show the category overlay again if you like
  crAddCatForm.classList.add("hidden");
  crCategoryOverlay.classList.remove("hidden");

  alert("Category saved!");
});


  
  ///////////////////////////////////////////////////
  // END: New Category Selection Code (with Firestore)
  ///////////////////////////////////////////////////
  // Show the full-screen overlay



  const initializeFirebaseFeatures = (app) => {
    auth = getAuth(app);
    db = getFirestore(app);
   
  
    // All your existing code for signIn, signOut, etc.
    // (the code that references 'auth' for transactions)
  
    
    // --- Settings Modal Enhancements ---
    // Make sure to import everything you need at the top of your file, for example:
  // import { sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
  // import { doc, getDoc, setDoc } from "firebase/firestore"; 
  // ... plus any other imports you use (e.g., getAuth, etc.)
  
  // --- Settings Modal Enhancements ---
  // DOM elements for the Settings modal
  const settingsButton = document.getElementById("settings-button");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsButton = document.getElementById("close-settings");
  const saveSettingsButton = document.getElementById("save-settings");
  
  // Profile Picture and Display Name
  const profilePicInput = document.getElementById("profile-pic-input");
  const profilePicPreview = document.getElementById("profile-pic-preview");
  const displayNameInput = document.getElementById("display-name-input");
  
  // Theme toggle
  const themeToggle = document.getElementById("theme-toggle");
  
  // Notification Preferences
  const emailNotificationsCheckbox = document.getElementById("email-notifications");
  const pushNotificationsCheckbox = document.getElementById("push-notifications");
  
  // Currency
  const currencySelect = document.getElementById("currency-select");
  
  // Reset Password button
  const resetPasswordButton = document.getElementById("reset-password-button");
  
  // Delete Account button and the "Confirm Deletion" popup
  const deleteAccountButton = document.getElementById("delete-account-button");
  const confirmDeletionPopup = document.getElementById("confirm-deletion-popup");
  const closeDeletionPopup = document.getElementById("close-deletion-popup");
  const deleteAccountPasswordInput = document.getElementById("delete-account-password");
  const confirmDeleteButton = document.getElementById("confirm-delete-button");
  
  // When the settings button is clicked, load existing settings from Firestore
  settingsButton.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Profile Picture
        profilePicPreview.src = data.photoUrl ? data.photoUrl : "default-avatar.png";
        // Display Name
        displayNameInput.value = data.displayName ? data.displayName : "";
        // Load preferences if they exist
        if (data.preferences) {
          // Theme
          themeToggle.checked = data.preferences.theme === "dark";
          // Notifications
          emailNotificationsCheckbox.checked = data.preferences.emailNotifications || false;
          pushNotificationsCheckbox.checked = data.preferences.pushNotifications || false;
          // Currency
          if (data.preferences.currency) {
            currencySelect.value = data.preferences.currency;
          }
        }
      }
    }
    settingsModal.classList.add("show");
    settingsModal.classList.remove("hide");
  });
  
  // Close the settings modal (using the Cancel button)
  closeSettingsButton.addEventListener("click", () => {
    settingsModal.classList.remove("show");
    settingsModal.classList.add("hide");
  });
  
  // Also, if you want an "X" icon on the settings modal, ensure its HTML contains an element with id "close-settings-icon"
  // and wire it up like this:
  const closeSettingsIcon = document.getElementById("close-settings-icon");
  if (closeSettingsIcon) {
    closeSettingsIcon.addEventListener("click", () => {
      settingsModal.classList.remove("show");
      settingsModal.classList.add("hide");
    });
  }
  
  // Save settings (profile info + preferences)
  saveSettingsButton.addEventListener("click", async () => {
    const displayName = displayNameInput.value;
    const newPhotoUrl = profilePicPreview.src;
    
    // Gather additional preferences
    const theme = themeToggle.checked ? "dark" : "light";
    const emailNotifications = emailNotificationsCheckbox.checked;
    const pushNotifications = pushNotificationsCheckbox.checked;
    const currency = currencySelect.value;
    
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("No user is logged in.");
        return;
      }
      const userDocRef = doc(db, "users", user.uid);
      // Save profile and preference data
      await setDoc(userDocRef, {
        displayName,
        photoUrl: newPhotoUrl,
        preferences: {
          theme,
          emailNotifications,
          pushNotifications,
          currency,
        },
      }, { merge: true });
      alert("Settings saved successfully!");
      loadDashboard(user); // Refresh dashboard to reflect changes
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Check console for details.");
    }
    
    settingsModal.classList.remove("show");
    settingsModal.classList.add("hide");
  });
  
  // Update profile picture preview immediately when a new file is selected
  profilePicInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        profilePicPreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  
  // Reset Password: Send a password reset link to the user's email
  resetPasswordButton.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("No user is logged in.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert("A password reset link has been sent to your email.");
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert("Failed to send reset email. Check console for details.");
    }
  });
  
  // Delete Account: show the Confirm Deletion popup (make sure this popup is not nested inside the settings modal)
  deleteAccountButton.addEventListener("click", () => {
    confirmDeletionPopup.classList.remove("hidden");
  });
  
  // Close the Confirm Deletion popup
  closeDeletionPopup.addEventListener("click", () => {
    confirmDeletionPopup.classList.add("hidden");
    deleteAccountPasswordInput.value = ""; // clear password
  });
  
  // Confirm Delete: re-authenticate with current password, then delete user
  confirmDeleteButton.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("No user is logged in.");
      return;
    }
    const currentPassword = deleteAccountPasswordInput.value.trim();
    if (!currentPassword) {
      alert("Please enter your current password.");
      return;
    }
    try {
      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // If successful, delete the user
      await deleteUser(user);
      alert("Account deleted successfully.");
      // Optionally redirect or reload
      window.location.reload();
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account: " + error.message);
    } finally {
      confirmDeletionPopup.classList.add("hidden");
      deleteAccountPasswordInput.value = "";
    }
  });
  
  // Theme toggle: applying or removing "dark-mode" class on body
  themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode", themeToggle.checked);
  });
  
  
  
  
    // DOM Elements
    const addBudgetForm = document.getElementById("add-budget-form");
    const transactionForm = document.getElementById("transaction-form");
    const authContainer = document.getElementById("auth-container");
    const dashboardContainer = document.getElementById("dashboard-container");
    const authForm = document.getElementById("auth-form");
    const authButton = document.getElementById("auth-button");
    const toggleLink = document.getElementById("toggle-link");
    const googleSignInButton = document.getElementById("google-signin-button");
    const logoutButton = document.getElementById("logout-button");
    const balanceDisplay = document.getElementById("balance");
    const addTransactionButton = document.getElementById("add-transaction-button");
   // References
const transactionPopup = document.getElementById("cr-transaction-popup");
const closePopupButton = document.getElementById("cr-close-transaction-popup");

const discardPopup = document.getElementById("discard-popup");
const discardCancelBtn = document.getElementById("discard-cancel-btn");
const discardConfirmBtn = document.getElementById("discard-confirm-btn");
// Remove the duplicate event listener on the close button.
// Use only this one which handles unsaved data:
// Helper to clear the transaction popup fields
function clearTransactionPopup() {
  document.getElementById("cr-income-form").reset();
  document.getElementById("cr-expense-form").reset();
  document.getElementById("cr-chosen-income-category-text").textContent = "";
  document.getElementById("cr-chosen-expense-category-text").textContent = "";
}

// Function to close the transaction popup
function closeTransactionPopup(restoreTransactionsPage) {
  transactionPopup.classList.add("hidden");
  clearTransactionPopup();
  editingTransactionId = null;
  editingTransactionType = null;
  // If we need to restore the transactions page, do so:
  if (restoreTransactionsPage) {
    const transactionsPage = document.getElementById("transactions-page");
    if (transactionsPage) {
      transactionsPage.classList.remove("hidden");
      transactionsPage.classList.add("show");
    }
  }
}

// X button handler for the transaction popup
closePopupButton.addEventListener("click", () => {
  // If editing an existing transaction, cancel the edit and close the popup
  if (editingTransactionId !== null) {
    closeTransactionPopup(true);
    return;
  }
  
  // For a new transaction, check if any fields have content
  const fields = transactionPopup.querySelectorAll("input, textarea");
  let hasContent = false;
  fields.forEach(field => {
    if (field.value.trim() !== "") {
      hasContent = true;
    }
  });
  
  if (hasContent) {
    // Show the discard confirmation overlay
    discardPopup.classList.remove("hidden");
  } else {
    closeTransactionPopup(false);
  }
});

// Discard popup handlers
discardCancelBtn.addEventListener("click", () => {
  // Hide the discard overlay but leave the transaction popup open
  discardPopup.classList.add("hidden");
});

discardConfirmBtn.addEventListener("click", () => {
  // Clear the popup and close it
  clearTransactionPopup();
  discardPopup.classList.add("hidden");
  closeTransactionPopup(false);
});






    
  const incomeTab = document.getElementById("cr-income-tab");
  const expenseTab = document.getElementById("cr-expense-tab");
  const incomeFields = document.getElementById("income-fields");
  const expenseFields = document.getElementById("expense-fields");
  // Grab the forgot-password-button element once at the top:
  const forgotPasswordBtn = document.getElementById("forgot-password-button");
  const transactionsButton = document.getElementById("transactions-button");
  
  const allTab = document.getElementById("all-tab");
  const incomeTabList = document.getElementById("income-tab-list");
  const expenseTabList = document.getElementById("expense-tab-list");
  const transactionsListContent = document.getElementById("transactions-list-content");
  
    // Toggle Login/Sign-Up
    toggleLink.addEventListener("click", () => {
      const isLogin = authButton.textContent === "Log In";
      document.getElementById("form-title").textContent = isLogin
        ? "Sign Up to Budget App"
        : "Welcome Back!";
      authButton.textContent = isLogin ? "Sign Up" : "Log In";
      toggleLink.textContent = isLogin
        ? "Log in"
        : "Sign up";
  
        const isNowLogin = (authButton.textContent === "Log In");
        forgotPasswordBtn.style.display = isNowLogin ? "block" : "none";
    });
  // On page load, if the auth button says "Log In" or "Sign Up", set forgot password accordingly:
  document.addEventListener("DOMContentLoaded", () => {
    const authBtnText = authButton.textContent; // e.g. "Continue" or "Sign Up" or "Log In"
    const isLogin = (authBtnText === "Log In");
    forgotPasswordBtn.style.display = isLogin ? "block" : "none";
  });
  
    // Handle Email/Password Authentication
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("auth-email").value;
      const password = document.getElementById("auth-password").value;
    
      try {
        if (authButton.textContent === "Log In") {
          // Existing login flow (we’ll adjust the login function separately)
          await signInWithEmailAndPassword(auth, email, password);
          alert("Logged in successfully!");
        } else {
          // Sign-Up flow:
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
          // Send the verification email
          await sendEmailVerification(user);
          
          await user.reload();
          if (!user.emailVerified) {
              alert("Please verify your email before logging in.");
              await signOut(auth); // Log them out
              return;
          }
          
          alert("A verification email has been sent. Please check your inbox and verify your email before logging in.");
        }
      } catch (error) {
        console.error("Authentication Error:", error.message);
        alert(error.message);
      }
    });
    
    
    const signInWithEmail = async (email, password) => {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
      -    // Check if email is verified
      -    await user.reload();
      if (!user.emailVerified) {
        alert("Please verify your email before logging in.");
        await signOut(auth);
        return;
      }
        } catch (error) {
          console.error("Login Error:", error.message);
          alert(error.message);
        }
      };
      
    
    // Handle Google Sign-In
    const provider = new GoogleAuthProvider();
  
    googleSignInButton.addEventListener("click", async () => {
      try {
        const provider = new GoogleAuthProvider(); 
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
    
        // Firestore logic to create user document
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
    
        if (!userDoc.exists()) {
          // Make sure to include categories: [] if you want new docs to have them
          await setDoc(userDocRef, {
            balance: 0,
            budgets: [],
            expenses: [],
            categories: []
          }, { merge: true });
        }
    
      } catch (error) {
        console.error("Google Sign-In Error:", error.message);
        alert("Error signing in with Google.");
      }
    });
    
  
  const microsoftButton = document.getElementById("microsoft-signin-button");
  
  microsoftButton.addEventListener("click", async () => {
    const provider = new OAuthProvider('microsoft.com');
  
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
  
      console.log(`Welcome ${user.displayName}`);
      
    } catch (error) {
      console.error("Microsoft Sign-In Error:", error);
      alert(`Failed to sign in with Microsoft. ${error.message}`);
    }
  });
  
  
     // Monitor Authentication State
     onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
    
        if (!userSnap.exists()) {
          // This user doc doesn't exist yet -> create it with default categories
          await setDoc(userDocRef, {
            expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
            incomeCategories: DEFAULT_INCOME_CATEGORIES,
            // add any other defaults you want, e.g. balance: 0
            balance: 0,
            incomes: [],
            expenses: [],
          }, { merge: true });
        } else {
          // The user doc exists, but let's confirm categories are there.
          // If they're missing or empty, we can set them:
          const data = userSnap.data();
          if (!Array.isArray(data.expenseCategories) || data.expenseCategories.length === 0) {
            await setDoc(userDocRef, { expenseCategories: DEFAULT_EXPENSE_CATEGORIES }, { merge: true });
          }
          if (!Array.isArray(data.incomeCategories) || data.incomeCategories.length === 0) {
            await setDoc(userDocRef, { incomeCategories: DEFAULT_INCOME_CATEGORIES }, { merge: true });
          }
        }
    
        // Now we definitely have categories in the doc
        await loadCategoriesFromFirestore(user);
    
        // Then show the dashboard
        authContainer.style.display = "none";
        dashboardContainer.style.display = "block";
        loadDashboard(user);
    
      } else {
        authContainer.style.display = "block";
        dashboardContainer.style.display = "none";
      }
    });
    
    
  // BEGGING OF THE TRANSACTION LISTING CODE
  /***************************************************
    TRANSACTIONS PANEL – FULL SCREEN, CARD STYLE, WITH BACK BUTTON
  ****************************************************/
  
  // Helper: Looks up the category icon URL from the stored categories
  function getCategoryIcon(tx) {
    // For income transactions, use the incomeCategories array; for expense, expenseCategories.
    let categoryName = tx.type === "Income" ? tx.source : tx.category;
    let categoryList = tx.type === "Income" ? incomeCategories : expenseCategories;
    if (!categoryName || !categoryList) return null;
    const found = categoryList.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    return found ? `./icons/${found.icon}` : null;
  }
  function renderTransactionCard(tx, index) {
    const card = document.createElement("div");
    card.classList.add("transaction-card");
  
    // Icon area
    const icon = document.createElement("div");
    icon.classList.add("transaction-icon");
    const categoryIconUrl = getCategoryIcon(tx);
    if (categoryIconUrl) {
      icon.innerHTML = `<img src="${categoryIconUrl}" alt="${tx.type === "Income" ? tx.source : tx.category}" />`;
    } else {
      icon.innerHTML = `<i class="fa fa-money-bill-wave"></i>`;
    }
  
    // Transaction details
    const details = document.createElement("div");
    details.classList.add("transaction-details");
  
    // Category or Source
    const catOrSource = tx.type === "Income" ? tx.source : tx.category;
    const nameEl = document.createElement("div");
    nameEl.classList.add("transaction-name");
    nameEl.textContent = catOrSource;
  
    // Title in smaller text
    const titleEl = document.createElement("div");
    titleEl.classList.add("transaction-subtitle");
    titleEl.textContent = tx.title || "";
  
    // Timestamp
    const timeEl = document.createElement("div");
    timeEl.classList.add("transaction-time");
    const date = tx.timestamp ? new Date(tx.timestamp) : new Date();
    timeEl.textContent = date.toLocaleString();
  
    details.appendChild(nameEl);
    details.appendChild(titleEl);
    details.appendChild(timeEl);
  
    // Amount
    const amountEl = document.createElement("div");
    amountEl.classList.add("transaction-amount");
    const amt = parseFloat(tx.amount).toFixed(2);
    amountEl.textContent = (tx.type === "Income" ? "+$" : "-$") + amt;
    amountEl.classList.add(tx.type === "Income" ? "positive" : "negative");
  
    // Put it all together
    card.appendChild(icon);
    card.appendChild(details);
    card.appendChild(amountEl);
  
    // Make the card clickable to edit
    card.addEventListener("click", () => openEditTransactionPopup(tx, index));
  
    return card;
  }
  
  
  // Function to set active tab and load transactions accordingly
  async function setActiveTransactionTab(filter) {
    // Remove 'active' class from all tab buttons
    allTab.classList.remove("active");
    incomeTabList.classList.remove("active");
    expenseTabList.classList.remove("active");
  
    // Add 'active' to the selected tab
    if (filter === "all") {
      allTab.classList.add("active");
    } else if (filter === "income") {
      incomeTabList.classList.add("active");
    } else if (filter === "expense") {
      expenseTabList.classList.add("active");
    }
    
    await loadTransactions(filter);
  }
  
  // Function to load transactions from Firestore and render them as cards
  async function loadTransactions(filter) {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to view transactions.");
      return;
    }
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      transactionsListContent.innerHTML = "<p>No transaction data found.</p>";
      window.transactionsData = [];
      return;
    }
    const userData = userDoc.data();
    let incomes = userData.incomes || [];
    let expenses = userData.expenses || [];
  
    // Annotate each with a type property
    incomes = incomes.map(tx => ({ ...tx, type: "Income" }));
    expenses = expenses.map(tx => ({ ...tx, type: "Expense" }));
  
    // Combine all transactions and sort by timestamp descending
    let allTransactions = [...incomes, ...expenses];
    allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
    let transactionsToShow = [];
    if (filter === "all") {
      transactionsToShow = allTransactions;
    } else if (filter === "income") {
      transactionsToShow = incomes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (filter === "expense") {
      transactionsToShow = expenses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    window.transactionsData = transactionsToShow;
  
    // Render transaction cards
    transactionsListContent.innerHTML = "";
    if (transactionsToShow.length === 0) {
      transactionsListContent.innerHTML = "<p>No transactions found.</p>";
      return;
    }
    transactionsToShow.forEach((tx, index) => {
      const card = renderTransactionCard(tx, index);
      transactionsListContent.appendChild(card);
    });
    
  }
  
  // Attach event listeners for the transaction tabs
  allTab.addEventListener("click", () => setActiveTransactionTab("all"));
  incomeTabList.addEventListener("click", () => setActiveTransactionTab("income"));
  expenseTabList.addEventListener("click", () => setActiveTransactionTab("expense"));
  
  // Event listener for opening the full-screen transactions panel
  transactionsButton.addEventListener("click", () => {
    setActiveTransactionTab("all"); // Default to All
    transactionsPage.classList.remove("hidden");
    transactionsPage.classList.add("show");
  });
  
  // Get references for the full-screen transactions panel and its back button
  const transactionsPage = document.getElementById("transactions-page");
  const closeTransactionsPage = document.getElementById("close-transactions-page");
  
  // When the back button is clicked, remove the 'show' class (which brings it on-screen),
  // then after the transition delay, add the 'hidden' class so it’s completely off-screen.
  closeTransactionsPage.addEventListener("click", () => {
    transactionsPage.classList.remove("show");
    setTimeout(() => {
      transactionsPage.classList.add("hidden");
    }, 300); // 300ms should match your CSS transition duration
  });
  
  
  // CSV download remains unchanged
  document.getElementById("download-transactions").addEventListener("click", () => {
    const transactions = window.transactionsData || [];
    if (transactions.length === 0) {
      alert("No transactions to download.");
      return;
    }
    let csv = "Type,Category/Source,Amount,Time\n";
    transactions.forEach(tx => {
      const type = tx.type;
      const categorySource = tx.type === "Income" ? tx.source : tx.category;
      const amount = parseFloat(tx.amount).toFixed(2);
      const time = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "";
      csv += `"${type}","${categorySource}",${amount},"${time}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  });
  
  
  // END OF THE TRANSACTION LISTING CODE
  let editingTransactionId = null;
  let editingTransactionType = null; // "Income" or "Expense"
  
function openEditTransactionPopup(tx, index) {
  editingTransactionId = tx.id;
  editingTransactionType = tx.type;
  // Hide the transactions page so the popup is in focus
  const transactionsPage = document.getElementById("transactions-page");
  if (transactionsPage) {
    transactionsPage.classList.add("hidden");
    transactionsPage.classList.remove("show");
  }
  transactionPopup.classList.remove("hidden");

  // If it's Income, show the income tab; else show expense tab
  if (tx.type === "Income") {
    // Switch to income tab
    incomeTab.classList.add("active");
    expenseTab.classList.remove("active");
    document.getElementById("cr-income-form").classList.add("active");
    document.getElementById("cr-income-form").classList.remove("hidden");
    document.getElementById("cr-expense-form").classList.add("hidden");
    document.getElementById("cr-expense-form").classList.remove("active");

    // Fill fields
    document.getElementById("cr-income-title").value = tx.title || "";
    document.getElementById("cr-income-notes").value = tx.notes || "";
    document.getElementById("cr-popup-income-amount").value = tx.amount;
    document.getElementById("cr-chosen-income-category").value = tx.source || "";
    document.getElementById("cr-chosen-income-category-text").textContent = tx.source || "";
    headerAmountText.textContent = `$${tx.amount || 0}`;
    headerAmountText.style.color = "#2e7d32";

  } else {
    // Switch to expense tab
    expenseTab.classList.add("active");
    incomeTab.classList.remove("active");
    document.getElementById("cr-expense-form").classList.add("active");
    document.getElementById("cr-expense-form").classList.remove("hidden");
    document.getElementById("cr-income-form").classList.add("hidden");
    document.getElementById("cr-income-form").classList.remove("active");

    // Fill fields
    document.getElementById("cr-expense-title").value = tx.title || "";
    document.getElementById("cr-expense-notes").value = tx.notes || "";
    document.getElementById("cr-popup-expense-amount").value = tx.amount;
    document.getElementById("cr-chosen-expense-category").value = tx.category || "";
    document.getElementById("cr-chosen-expense-category-text").textContent = tx.category || "";
    headerAmountText.textContent = `$${tx.amount || 0}`;
    headerAmountText.style.color = "#d32f2f";
  }

  // Optionally rename the submit button from "Save" to "Update"
  const saveIncomeBtn = document.querySelector("#cr-income-form .btn-primary");
  const saveExpenseBtn = document.querySelector("#cr-expense-form .btn-primary");
  saveIncomeBtn.textContent = "Update Income";
  saveExpenseBtn.textContent = "Update Expense";
  
  // Show a "Delete" button if you want:
  // ... or handle delete differently
}

  
  
  // Load Dashboard
  const loadDashboard = async (user) => {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
  
    // Extract the username from the user's email
    const email = user.email;
    const username = email.substring(0, email.indexOf("@")).replace(".", " ").replace("_", " ");
  
    // Determine the greeting based on the time of day
    const hours = new Date().getHours();
    const greeting =
      hours >= 5 && hours < 12
        ? "Good Morning"
        : hours >= 12 && hours < 18
        ? "Good Afternoon"
        : "Good Evening";
  
    // Grab DOM elements once
    const usernameDisplay = document.getElementById("username-display");
    const userProfilePic = document.getElementById("user-profile-pic");
    const balanceDisplay = document.getElementById("balance");
  
    // If the user document exists in Firestore
    if (userDoc.exists()) {
      // Inside loadDashboard(user):
  const data = userDoc.data();
     
      // Update mobile profile images
      const mobileProfileIcon = document.getElementById("mobile-profile-icon");
      const mobileProfilePagePhoto = document.getElementById("profile-page-photo");
      mobileProfileIcon.src = data.photoUrl ? data.photoUrl : "default-avatar.png";
      mobileProfilePagePhoto.src = data.photoUrl ? data.photoUrl : "default-avatar.png";
    
      // Get the mobile modal elements
      const profilePageModal = document.getElementById("profile-page");
      const profilePageClose = document.getElementById("profile-page-close");
      const profilePageSettings = document.getElementById("profile-page-settings");
      const profilePageLogout = document.getElementById("profile-page-logout");
    
     // When the mobile profile icon is clicked, show the profile modal smoothly
     mobileProfileIcon.addEventListener("click", () => {
      profilePageModal.classList.add("show");
    });
    
    profilePageClose.addEventListener("click", () => {
      profilePageModal.classList.remove("show");
    });
    
    
      // When the mobile Settings button is clicked,
      // load the user’s profile name and icon into the settings modal
      // then open the settings modal.
      profilePageSettings.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Update settings modal elements with user data
            const profilePicPreview = document.getElementById("profile-pic-preview");
            const displayNameInput = document.getElementById("display-name-input");
            profilePicPreview.src = data.photoUrl ? data.photoUrl : "default-avatar.png";
            displayNameInput.value = data.displayName ? data.displayName : "";
          }
        }
        // Open settings modal and close mobile profile modal
        settingsModal.classList.remove("hide");
        settingsModal.classList.add("show");
        profilePageModal.classList.remove("show");
        profilePageModal.classList.add("hide");
      });
    
      // When the mobile Log Out button is clicked,
      // sign out the user and reload the page.
      profilePageLogout.addEventListener("click", async () => {
        try {
          await signOut(auth);
          
          location.reload();
        } catch (error) {
          console.error("Mobile logout error:", error);
          alert("An error occurred during logout.");
        }
      });
      // -------------------------
// Real-time Clock Setup
// -------------------------
const transactionClock = document.getElementById("transaction-clock");

function updateTransactionClock() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  let displayHour = hours % 12 || 12;
  let ampm = hours >= 12 ? "PM" : "AM";
  transactionClock.textContent = `${displayHour}:${minutes} ${ampm}`;
}
setInterval(updateTransactionClock, 1000);
updateTransactionClock();

// -------------------------
// Global Element References
// -------------------------
const transactionLoading = document.getElementById("transaction-loading");


// Header Amount Display
const headerAmountText = document.getElementById("header-amount-text");


// -------------------------
// Form Input Listeners for Updating Big Amount Display
// -------------------------
const incomeAmountInput = document.getElementById("cr-popup-income-amount");
const expenseAmountInput = document.getElementById("cr-popup-expense-amount");

incomeAmountInput.addEventListener("input", () => {
  headerAmountText.textContent = `$${incomeAmountInput.value || 0}`;
});
expenseAmountInput.addEventListener("input", () => {
  headerAmountText.textContent = `$${expenseAmountInput.value || 0}`;
});

// -------------------------
// Income Form Submission 
// -------------------------
document.getElementById("cr-income-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  transactionLoading.classList.remove("hidden");
  try {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first!");
      return;
    }
    const amount = parseFloat(incomeAmountInput.value);
    const source = document.getElementById("cr-chosen-income-category").value;
    const title = document.getElementById("cr-income-title").value.trim();
    const notes = document.getElementById("cr-income-notes").value.trim();

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    let userData = userDoc.exists()
      ? userDoc.data()
      : { balance: 0, incomes: [], expenses: [] };

    if (editingTransactionType === "Income" && editingTransactionId) {
      // Find the transaction by its unique id
      const txIndex = userData.incomes.findIndex(tx => tx.id === editingTransactionId);
      if (txIndex > -1) {
        const oldTx = userData.incomes[txIndex];
        // Remove the old transaction's amount from the balance
        userData.balance -= parseFloat(oldTx.amount);
        // Update the transaction while keeping its id and timestamp
        userData.incomes[txIndex] = {
          id: editingTransactionId,
          amount,
          source,
          timestamp: oldTx.timestamp,
          title,
          notes
        };
        // Add the new amount to the balance
        userData.balance += amount;
      }
    } else {
      // Create a new transaction with a unique id
      const now = new Date();
      const newId = 'inc-' + now.getTime() + '-' + Math.floor(Math.random() * 1000);
      userData.incomes.push({
        id: newId,
        amount,
        source,
        timestamp: now.toISOString(),
        title,
        notes
      });
      userData.balance += amount;
    }

    await setDoc(userDocRef, userData, { merge: true });
    balanceDisplay.textContent = `$${userData.balance.toFixed(2)}`;

    // Refresh the dashboard so changes are immediately visible
    loadDashboard(user);

    // Reset editing state and clear the popup
    editingTransactionId = null;
    editingTransactionType = null;
    document.getElementById("cr-income-form").reset();
    crChosenIncomeCategoryText.textContent = "";
    transactionPopup.classList.add("hidden");
  } catch (error) {
    console.error("Error saving income:", error);
    alert("Failed to save income.");
  } finally {
    transactionLoading.classList.add("hidden");
  }
});


// -------------------------
// Expense Form Submission 
// -------------------------
document.getElementById("cr-expense-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  transactionLoading.classList.remove("hidden");
  try {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first!");
      return;
    }
    const amount = parseFloat(expenseAmountInput.value);
    const category = document.getElementById("cr-chosen-expense-category").value;
    const title = document.getElementById("cr-expense-title").value.trim();
    const notes = document.getElementById("cr-expense-notes").value.trim();

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    let userData = userDoc.exists()
      ? userDoc.data()
      : { balance: 0, incomes: [], expenses: [] };

    if (editingTransactionType === "Expense" && editingTransactionId) {
      // Find the transaction by its unique id
      const txIndex = userData.expenses.findIndex(tx => tx.id === editingTransactionId);
      if (txIndex > -1) {
        const oldTx = userData.expenses[txIndex];
        // For expense, first add back the old amount (since it was subtracted)
        userData.balance += parseFloat(oldTx.amount);
        // Update the transaction while keeping its id and original timestamp
        userData.expenses[txIndex] = {
          id: editingTransactionId,
          amount,
          category,
          timestamp: oldTx.timestamp,
          title,
          notes
        };
        // Subtract the new amount from the balance
        userData.balance -= amount;
      }
    } else {
      // Create a new expense transaction with a unique id
      const now = new Date();
      const newId = 'exp-' + now.getTime() + '-' + Math.floor(Math.random() * 1000);
      userData.expenses.push({
        id: newId,
        amount,
        category,
        timestamp: now.toISOString(),
        title,
        notes
      });
      userData.balance -= amount;
    }

    await setDoc(userDocRef, userData, { merge: true });
    balanceDisplay.textContent = `$${userData.balance.toFixed(2)}`;

    // Refresh the dashboard so that the update shows immediately
    loadDashboard(user);

    // Reset editing state and clear the popup
    editingTransactionId = null;
    editingTransactionType = null;
    document.getElementById("cr-expense-form").reset();
    crChosenExpenseCategoryText.textContent = "";
    transactionPopup.classList.add("hidden");
  } catch (error) {
    console.error("Error saving expense:", error);
    alert("Failed to save expense.");
  } finally {
    transactionLoading.classList.add("hidden");
  }
});



// -------------------------
// Tab Toggling: Income vs Expense
// -------------------------
expenseTab.addEventListener("click", () => {
  expenseTab.classList.add("active");
  incomeTab.classList.remove("active");
  document.getElementById("cr-expense-form").classList.add("active");
  document.getElementById("cr-expense-form").classList.remove("hidden");
  document.getElementById("cr-income-form").classList.add("hidden");
  document.getElementById("cr-income-form").classList.remove("active");
  headerAmountText.style.color = "#d32f2f"; // red for expense
});

incomeTab.addEventListener("click", () => {
  incomeTab.classList.add("active");
  expenseTab.classList.remove("active");
  document.getElementById("cr-income-form").classList.add("active");
  document.getElementById("cr-income-form").classList.remove("hidden");
  document.getElementById("cr-expense-form").classList.add("hidden");
  document.getElementById("cr-expense-form").classList.remove("active");
  headerAmountText.style.color = "#2e7d32"; // green for income
});


  
      // Display balance
      if (typeof data.balance === "number") {
        balanceDisplay.textContent = `$${data.balance.toFixed(2)}`;
      } else {
        balanceDisplay.textContent = "$0.00";
      }
  
      // Display name or fallback
      const finalName = data.displayName ? data.displayName : username;
      usernameDisplay.textContent = `${greeting}, ${finalName}`;
  
      // Profile pic if it exists
      if (data.photoUrl) {
        userProfilePic.src = data.photoUrl;
      }
      updateSummaryBoxes(data);
  // 1) Build your daily net balance series (already done in your code)
const netBalanceSeries = buildDailyNetBalanceSeries(
  data.incomes || [],
  data.expenses || []
);

// 2) Define the chart options
const chartOptions = {
  series: [{
    name: "Net Balance",
    data: netBalanceSeries
  }],
  chart: {
    type: 'area',
    height: 350,
    // If you want a light background color directly on the chart:
    background: '#fff',
    toolbar: { show: false },
    zoom: { enabled: false },
    dropShadow: {
      enabled: true,
      top: 4,
      left: 0,
      blur: 6,
      opacity: 0.15,
      color: '#000'
    },
  },
  stroke: {
    curve: 'smooth',
    width: 3,
    colors: ['#4285F4'] // The line color
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      // The fill below the line transitions from a semi-opaque color
      // near the line to fully transparent near the bottom
      gradientToColors: ['#4285F4'],
      opacityFrom: 0.3,
      opacityTo: 0.0,
      stops: [0, 90, 100],
      inverseColors: false
    }
  },
  dataLabels: { enabled: false },
  markers: {
    size: 0, // Hide by default
    hover: { size: 6 },
    strokeWidth: 2,
    strokeColors: '#fff'
  },
  xaxis: {
    type: 'datetime',
    labels: {
      // e.g. "Feb 9", "Mar 1" 
      // The actual ticks depend on your data’s date range
      format: 'MMM d',
      style: {
        fontSize: '13px',
        colors: ['#666']
      }
    },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: {
      style: {
        fontSize: '13px',
        colors: ['#666']
      },
      formatter: val => `$${val.toFixed(2)}`
    },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  tooltip: {
    theme: 'light',
    x: { format: 'MMM dd, yyyy' },
    y: {
      formatter: val => `$${val.toFixed(2)}`,
      title: { formatter: () => 'Balance:' }
    },
    style: { fontSize: '14px' }
  },
  grid: {
    borderColor: '#ddd',
    strokeDashArray: 4, // Dotted/dashed grid
    padding: { left: 15, right: 15 }
  },
  legend: { show: false },
  // Responsive rules for mobile
  responsive: [{
    breakpoint: 768,
    options: {
      chart: { height: 250 },
      stroke: { width: 2 },
      xaxis: {
        labels: { style: { fontSize: '12px' } }
      },
      yaxis: {
        labels: { style: { fontSize: '12px' } }
      }
    }
  }]
};

// 3) Destroy old chart if it exists, then render the new one
if (window.balanceChart) {
  window.balanceChart.destroy();
}
window.balanceChart = new ApexCharts(
  document.querySelector("#balance-chart"),
  chartOptions
);
window.balanceChart.render();




(function renderSpendingChart() {
  // Build category totals
  const catMap = {};
  (data.expenses || []).forEach(exp => {
    if (!catMap[exp.category]) catMap[exp.category] = 0;
    catMap[exp.category] += exp.amount;
  });

  const spendingCategories = Object.keys(catMap);
  const spendingAmounts = Object.values(catMap);

  // If no expenses, show a single slice
  if (spendingCategories.length === 0) {
    spendingCategories.push("No Expenses");
    spendingAmounts.push(0);
  }

  const donutOptions = {
    chart: {
      type: 'donut',
      height: 350,
      toolbar: { show: false },
      dropShadow: {
        enabled: true,
        top: 2,
        left: 2,
        blur: 4,
        color: '#000',
        opacity: 0.1
      },
      /*
        Offset to shift the donut chart to the right
        so the legend on the left doesn't overlap it.
        Adjust as needed for your design.
      */
      offsetX: 70
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            name: { fontSize: '14px' },
            value: {
              fontSize: '18px',
              formatter: val => val
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '16px',
              color: '#333',
              formatter: function (w) {
                // Sum all slices
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              }
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    series: spendingAmounts,
    labels: spendingCategories,
    colors: ['#66bb6a', '#ffa726', '#ef5350', '#26c6da', '#ab47bc', '#ffee58'],
    fill: { type: 'gradient' },
    stroke: {
      show: true,
      width: 2,
      colors: ['#fff'] // white stroke separating slices
    },
    /*
      Keep legend on the left for all screens.
      Adjust offsetY if you want it aligned differently vertically.
    */
    legend: {
      position: 'left',
      horizontalAlign: 'center',
      offsetY: 0,
      fontSize: '14px',
      markers: {
        width: 14,
        height: 14,
        radius: 7
      }
    },
    /*
      You can still use responsive if you want to tweak
      height or offset on smaller screens, but keep position: 'left'.
    */
    responsive: [{
      breakpoint: 768,
      options: {
        chart: {
          height: 300,
          // offsetX: 40 // optional: reduce offset on mobile if needed
        },
        legend: {
          fontSize: '12px',
          position: 'left', // remain on the left
          horizontalAlign: 'center'
        }
      }
    }]
  };

  const spendingChart = new ApexCharts(
    document.querySelector("#spending-chart"),
    donutOptions
  );
  spendingChart.render();
})();


      
      
    // --- Recent Transactions Section ---

// Combine incomes and expenses (add a 'type' property to each)
let incomes = data.incomes ? data.incomes.map(tx => ({ ...tx, type: "Income" })) : [];
let expenses = data.expenses ? data.expenses.map(tx => ({ ...tx, type: "Expense" })) : [];

// Combine and sort all transactions (most recent first)
let allTransactions = [...incomes, ...expenses];
allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// Function to render the recent transactions list (only last 6 for the chosen filter)
// Use the same getCategoryIcon(tx) you have in your app
// to get the correct icon URL from the user's categories.
function renderRecentTransactions(filter) {
  let filteredTransactions;
  if (filter === "income") {
    filteredTransactions = incomes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } else if (filter === "expense") {
    filteredTransactions = expenses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } else {
    filteredTransactions = allTransactions;
  }

  const recent = filteredTransactions.slice(0, 6);
  const container = document.getElementById("recent-transactions-list");
  container.innerHTML = "";

  if (!recent.length) {
    container.innerHTML = "<p>No recent transactions.</p>";
    return;
  }

  recent.forEach(tx => {
    const item = document.createElement("div");
    item.classList.add("recent-tx-item");

    // Icon
    const categoryIconUrl = getCategoryIcon(tx);
    const iconHtml = categoryIconUrl
      ? `<img src="${categoryIconUrl}" alt="icon" class="recent-tx-icon" />`
      : `<i class="fa fa-money-bill-wave"></i>`;

    // Show category (tx.source or tx.category) in bold, and title in smaller text
    const catOrSource = tx.type === "Income" ? tx.source : tx.category;
    const title = tx.title || ""; // fallback if no title

    // Format date and amount
    const dateStr = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : "N/A";
    const sign = tx.type === "Income" ? "+" : "-";
    const amount = parseFloat(tx.amount).toFixed(2);

    // Build the row’s HTML
    item.innerHTML = `
      <div class="recent-tx-icon-wrapper">
        ${iconHtml}
      </div>
      <div class="recent-tx-info">
        <div class="tx-label">${catOrSource}</div>
        <div class="tx-subtitle">${title}</div> 
      </div>
      <span class="tx-date">${dateStr}</span>
      <span class="tx-amount ${tx.type === "Income" ? "positive" : "negative"}">
        ${sign}$${amount}
      </span>
    `;

    container.appendChild(item);
  });
}


function updateSummaryBoxes(data) {
  // Get incomes and expenses arrays from your user data
  const incomes = data.incomes || [];
  const expenses = data.expenses || [];
  
  // Calculate totals
  const totalIncome = incomes.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const totalExpense = expenses.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  
  // Count transactions
  const incomeCount = incomes.length;
  const expenseCount = expenses.length;
  
  // Update the DOM elements with these values
  document.querySelector('.income-box .amount').textContent = `$${totalIncome.toFixed(2)}`;
  document.querySelector('.income-box .transactions-count').textContent = `${incomeCount} transactions`;
  
  document.querySelector('.expense-box .amount').textContent = `$${totalExpense.toFixed(2)}`;
  document.querySelector('.expense-box .transactions-count').textContent = `${expenseCount} transactions`;
}

// Helper to update active recent tab styling
function setActiveRecentTab(filter) {
  const tabs = document.querySelectorAll(".recent-tab");
  tabs.forEach(btn => btn.classList.remove("active"));
  document.getElementById(`recent-${filter}-tab`).classList.add("active");
}

// Attach event listeners for recent transactions tabs
document.getElementById("recent-all-tab").addEventListener("click", () => {
  setActiveRecentTab("all");
  renderRecentTransactions("all");
});
document.getElementById("recent-income-tab").addEventListener("click", () => {
  setActiveRecentTab("income");
  renderRecentTransactions("income");
});
document.getElementById("recent-expense-tab").addEventListener("click", () => {
  setActiveRecentTab("expense");
  renderRecentTransactions("expense");
});

// Initially render the "all" filter
renderRecentTransactions("all");

// Event listener for the "View All Transactions" button
document.getElementById("view-all-transactions").addEventListener("click", () => {
  // Assuming 'transactionsPage' is the full-screen panel
  setActiveTransactionTab("all"); // Use your existing full-panel tab function
  transactionsPage.classList.remove("hidden");
  transactionsPage.classList.add("show");
});

      
  
    } else {
      // If no user data exists, initialize defaults
      await setDoc(userDocRef, {
        balance: 0,
        incomes: [],
        expenses: [],
        categories: []
      }, { merge: true });
      balanceDisplay.textContent = "$0.00";
      usernameDisplay.textContent = `${greeting}, ${username}`;
  
      // Optionally, render empty ApexCharts here
      // e.g., a donut chart with no expenses, etc.
    }
  };
  
  
  // Handle Add Transaction Button Click (Show Popup)
  addTransactionButton.addEventListener("click", () => {
    transactionPopup.classList.remove("hidden");
    setActiveTab(incomeTab, incomeFields); // Default to showing Income tab
  });
  

  
    incomeTab.addEventListener("click", () => {
      incomeTab.classList.add("active");
      expenseTab.classList.remove("active");
      document.getElementById("cr-income-form").classList.add("active");
      document.getElementById("cr-income-form").classList.remove("hidden");
      document.getElementById("cr-expense-form").classList.add("hidden");
      document.getElementById("cr-expense-form").classList.remove("active");
    });
    
    expenseTab.addEventListener("click", () => {
      expenseTab.classList.add("active");
      incomeTab.classList.remove("active");
      document.getElementById("cr-expense-form").classList.add("active");
      document.getElementById("cr-expense-form").classList.remove("hidden");
      document.getElementById("cr-income-form").classList.add("hidden");
      document.getElementById("cr-income-form").classList.remove("active");
    });
    
  // Updated Event Listeners
  incomeTab.addEventListener("click", () => setActiveTab(incomeTab, incomeFields));
  expenseTab.addEventListener("click", () => setActiveTab(expenseTab, expenseFields));
    // Add Budget
    addBudgetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const category = document.getElementById("budget-category").value;
      const amount = parseFloat(document.getElementById("budget-amount").value);
      if (category && !isNaN(amount)) {
        const user = auth.currentUser;
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
  
        if (userDoc.exists()) {
          const data = userDoc.data();
          const budgets = [...data.budgets, { category, amount }];
          await setDoc(userDocRef, { ...data, budgets });
          updateBudgetsList(budgets);
          alert("Budget added successfully!");
          addBudgetForm.reset();
        }
      }
    });
   
     // Logout
     logoutButton.addEventListener("click", async () => {
      await signOut(auth);
      
      location.reload();
    });
  };
  
  document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logout-button");
  
    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        try {
          const auth = getAuth();
          await signOut(auth);
     
          location.reload();
        } catch (error) {
          console.error("Logout Error:", error);
          alert("An error occurred during logout.");
        }
      });
    } else {
      console.error("Logout button not found in the DOM.");
    }
  });
  
  
  
  
  
  
  
  // Start the app by initializing with the API key
  initializeAppWithApiKey();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    client_id: "31114956560-rmea0jtoq86qie75n0v3e1v06e8tk1e3.apps.googleusercontent.com", // Update with your actual Web Client ID
  });
  
  // Toggle More Options
  const moreLink = document.getElementById("more-link");
  const moreOptions = document.getElementById("more-options");
  moreLink.addEventListener("click", () => {
    moreOptions.classList.toggle("hidden");
  });
  
  document.querySelectorAll('.nav-more').forEach((more) => {
      more.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = document.createElement('ul');
        dropdown.classList.add('dropdown-menu');
        dropdown.innerHTML = `
          <li><a href="#">Profile</a></li>
          <li><a href="#">About</a></li>
          <li><a href="#">Logout</a></li>
        `;
        more.appendChild(dropdown);
      });
    });
    
    const showToast = (message) => {
      const toast = document.getElementById("toast-container");
      toast.textContent = message;
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 3000);
    };
    
    // Example usage
    showToast("Income added successfully!");
   
    // Enhanced Error Handling
  const showError = (message) => {
    const errorToast = document.getElementById("toast-container");
    errorToast.textContent = message;
    errorToast.style.backgroundColor = "#f44336";
    errorToast.classList.remove("hidden");
    setTimeout(() => errorToast.classList.add("hidden"), 3000);
  };
  
  
  
  // Sort Budgets
  const sortBudgets = (budgets, criteria) => {
    if (criteria === "category") {
      return budgets.sort((a, b) => a.category.localeCompare(b.category));
    }
    if (criteria === "amount") {
      return budgets.sort((a, b) => b.amount - a.amount);
    }
  };
  
  // Delete Budget or Expense
  const deleteItem = async (id, type) => {
    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
  
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (type === "budget") {
        data.budgets = data.budgets.filter((budget) => budget.id !== id);
      } else if (type === "expense") {
        data.expenses = data.expenses.filter((expense) => expense.id !== id);
      }
      await setDoc(userDocRef, data);
      loadDashboard(user);
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
    }
  };
  
  // Example: Adding delete button for budgets
  budgetsList.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-budget")) {
      const budgetId = e.target.dataset.id;
      deleteItem(budgetId, "budget");
    }
  });
  
  // Add User Preferences Loading
  document.addEventListener("DOMContentLoaded", () => {
    loadUserPreferences();
  });
  
  
  
  const setActiveTab = (activeTab, activeFields) => {
    document.querySelectorAll(".toggle-button").forEach((button) => {
      button.classList.remove("active");
    });
    document.querySelectorAll(".transaction-fields").forEach((field) => {
      field.classList.add("hidden");
    });
    activeTab.classList.add("active");
    activeFields.classList.remove("hidden");
  };
  
  
  
   
  
    // Destroy the previous chart instance to prevent duplication
    if (window.spendingChart) {
      window.spendingChart.destroy();
    }
  // Function to Load and Render the Line Chart
 
  
  
  
  
  
  
  
  
  
  
  
  












  
  
  
  
  























