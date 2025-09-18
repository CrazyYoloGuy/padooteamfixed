// Translation system for the driver app
const translations = {
    en: {
        // App Header
        appTitle: "Padoo Delivery",
        driverSubtitle: "Driver Dashboard",
        available: "Available",
        busy: "Busy",
        offline: "Offline",
        
        // Navigation
        home: "Home",
        orders: "Orders",
        history: "History",
        notifications: "Notifications",
        settings: "Settings",
        profile: "Profile",
        recent: "Recent",
        teamMembers: "Team Members",
        teamMembersManagement: "Team Members Management",
        
        // Home Page
        driverDashboard: "Driver Dashboard",
        currentDate: "Current Date",
        totalEarnings: "Total Earnings",
        totalOrders: "Total Orders",
        todaysOrders: "Today's Orders",
        
        // Quick Actions
        quickActions: "Quick Actions",
        addOrder: "Add Order",
        viewOrders: "View Orders",
        checkNotifications: "Check Notifications",
        
        // Recent Orders
        recentOrders: "Recent Orders",
        yourLatestOrders: "Your latest delivery orders",
        noRecentOrders: "No recent orders",
        viewAllOrders: "View All Orders",
        
        // Partner Shops
        partnerShops: "Partner Shops",
        noPartnerShops: "No partner shops added yet",
        addNewShop: "Add New Shop",
        viewAllShops: "View All Shops",
        
        // Orders Page
        allOrders: "All Orders",
        filterOrders: "Filter Orders",
        all: "All",
        today: "Today",
        week: "This Week",
        month: "This Month",
        noOrders: "No orders found",
        orderDetails: "Order Details",
        completedOrders: "Completed Orders",
        allDeliveredOrdersWithDriverInfo: "All delivered orders with driver information",
        manageYourDeliveryOrders: "Manage your delivery orders",
        // Orders page headers and states
        activeOrders: "Active Orders",
        liveOrders: "Live Orders",
        availableOrdersFromYourShops: "Available orders from your shops",
        noOrdersAvailable: "No orders available",
        noActiveOrders: "No active orders",
        activeOrdersAppear: "Orders you're working on will appear here",
        noCompletedOrders24h: "No completed orders in the last 24 hours",
        completedDeliveriesAppear: "Completed deliveries from the last 24 hours will appear here",
        
        // Notifications Page
        allNotifications: "All Notifications",
        noNotifications: "No notifications",
        markAsRead: "Mark as Read",
        clearAll: "Clear All",
        newNotification: "New notification",
        
        // Settings Page
        settingsTitle: "Settings",
        
        // Language Settings
        languageSettings: "Language Settings",
        languageSettingsDesc: "Choose your preferred language",
        currentLanguage: "Current Language",
        english: "English",
        greek: "Greek",
        changeLanguage: "Change Language",
        
        // Notification Settings
        notificationSettings: "Notification Settings",
        notificationSettingsDesc: "Configure how you receive notifications from shops",
        soundNotifications: "Sound Notifications",
        soundNotificationsDesc: "Play a sound when receiving new notifications",
        browserNotifications: "Browser Notifications",
        browserNotificationsDesc: "Show desktop notifications even when the app is in background",
        enabled: "Enabled",
        disabled: "Disabled",
        testSound: "Test Sound",
        enable: "Enable",
        blocked: "Blocked by Browser",
        
        // Earnings Settings
        earningsSettings: "Earnings Settings",
        earningsSettingsDesc: "Configure your earnings per order",
        earningsPerOrder: "Earnings Per Order",
        defaultEarnings: "Default Earnings",
        saveSettings: "Save Settings",
        
        // Shop Management
        shopManagement: "Shop Management",
        shopManagementDesc: "Add and manage your partner shops",
        searchShops: "Search shops...",
        addShop: "Add Shop",
        editShop: "Edit Shop",
        deleteShop: "Delete Shop",
        
        // Profile Page
        profileTitle: "Profile",
        profileName: "Driver Name",
        profileEmail: "Email",
        logout: "Logout",
        changePassword: "Change Password",
        accountInfo: "Account Info",
        memberSince: "Member Since",
        perOrder: "Per Order",
        account: "Account",
        support: "Support",
        helpCenter: "Help Center",
        announcementsTitle: "Announcements",
        announcementsDesc: "Important updates from admins",
        analytics: "Analytics",
        analyticsDesc: "Insights and metrics (coming soon)",
        accountAndPreferences: "Account and preferences",

        // Modals
        addOrderModal: "Add New Order",
        addShopModal: "Add New Shop",
        editShopModal: "Edit Shop",
        shopName: "Shop Name",
        shopCategory: "Category",
        selectCategory: "Select Category",
        orderAmount: "Order Amount",
        customerName: "Customer Name",
        customerPhone: "Customer Phone",
        deliveryAddress: "Delivery Address",
        notes: "Notes",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        confirm: "Confirm",

        // Toast Messages
        settingsSaved: "Settings saved successfully",
        languageChanged: "Language changed successfully",
        soundEnabled: "Sound notifications enabled",
        soundDisabled: "Sound notifications disabled",
        browserNotificationsEnabled: "Browser notifications enabled",
        orderAdded: "Order added successfully",
        orderUpdated: "Order updated successfully",
        orderDeleted: "Order deleted successfully",
        orderCompleted: "Order completed successfully",
        orderAccepted: "Order accepted successfully",
        shopAdded: "Shop added successfully",
        shopUpdated: "Shop updated successfully",
        shopDeleted: "Shop deleted successfully",
        notificationDeleted: "Notification deleted successfully",
        notificationUpdated: "Notification updated successfully",
        notificationConfirmed: "Notification confirmed successfully",
        loggedOut: "Logged out successfully",
        errorOccurred: "An error occurred",
        failedToSaveSettings: "Failed to save settings",
        pleaseSelectShop: "Please select a shop",
        pleaseEnterValidOrderPrice: "Please enter a valid order price",
        pleaseEnterValidPrice: "Please enter a valid price",
        pleaseEnterValidPricePaid: "Please enter a valid price (0 or higher for paid orders)",
        pleaseEnterValidTime: "Please enter a valid time between 1-120 minutes",
        failedToCompleteOrder: "Failed to complete order",
        failedToAcceptOrder: "Failed to accept order",
        failedToDeleteOrder: "Failed to delete order",
        failedToUpdateOrder: "Failed to update order",
        failedToAddOrder: "Failed to add order",
        failedToAddShop: "Failed to add shop",
        failedToLoadNotifications: "Failed to load notifications",
        sessionExpired: "Session expired. Please log in again.",
        
        // Time Formatting
        justNow: "Just now",
        minutesAgo: "minutes ago",
        hoursAgo: "hours ago",
        daysAgo: "days ago",
        recently: "Recently",
        
        // Common Actions
        close: "Close",
        back: "Back",
        next: "Next",
        previous: "Previous",
        loading: "Loading...",
        retry: "Retry",
        
        // Error Messages
        failedToLoad: "Failed to load. Please try again later.",
        connectionError: "Connection error. Please check your internet connection.",
        
        // Success Messages
        operationCompleted: "Operation completed successfully",
        dataSaved: "Data saved successfully",
        
        // Confirmation Messages
        confirmDelete: "Are you sure you want to delete this item?",
        confirmLogout: "Are you sure you want to logout?",
        
        // Back Button Messages
        useLogoutButton: "Please use the logout button to exit the app",
        backDisabled: "Back button is disabled for security reasons",
        cannotExit: "Cannot exit the app using back button",

        // Form Fields & Placeholders
        searchPlaceholder: "Search...",
        enterAmount: "Enter amount",
        enterOrderPrice: "Enter order price",
        enterCustomerName: "Enter customer name",
        enterCustomerPhone: "Enter customer phone",
        enterDeliveryAddress: "Enter delivery address",
        enterNotes: "Enter notes",
        enterShopName: "Enter shop name",
        selectCategoryPlaceholder: "Select a category",
        
        // Modal Titles & Content
        selectCategoryTitle: "Select Category",
        selectCategoryDesc: "Choose the category for your order",
        addOrderTitle: "Add New Order",
        editOrderTitle: "Edit Order",
        orderDetailsTitle: "Order Details",
        confirmDeleteTitle: "Confirm Delete",
        confirmDeleteDesc: "Are you sure you want to delete this item? This action cannot be undone.",
        
        // Form Labels
        category: "Category",
        price: "Price",
        customer: "Customer",
        phone: "Phone",
        address: "Address",
        paymentMethod: "Payment Method",
        cash: "Cash",
        paid: "Paid",
        
        // Buttons & Actions
        addOrder: "Add Order",
        editOrder: "Edit Order",
        saveOrder: "Save Order",
        updateOrder: "Update Order",
        cancelOrder: "Cancel Order",
        deleteOrder: "Delete Order",
        viewDetails: "View Details",
        markComplete: "Mark Complete",
        
        // Shop Management
        addPartnerShop: "Add Partner Shop",
        editPartnerShop: "Edit Partner Shop",
        deletePartnerShop: "Delete Partner Shop",
        manageShops: "Manage Shops",
        shopDetails: "Shop Details",
        
        // Status Messages
        processing: "Processing...",
        saving: "Saving...",
        deleting: "Deleting...",
        updating: "Updating...",
        completed: "Completed",
        pending: "Pending",
        accepted: "Accepted",
        confirmed: "Confirmed",
        cancelled: "Cancelled",

        // Quick Actions
        addNewOrder: "Add New Order",
        recordDelivery: "Record a new delivery order",
        managePartnerShops: "Manage Partner Shops",
        addEditShops: "Add or edit partner shops",
        recentActivity: "Recent Activity",
        
        // Empty States
        noOrdersYet: "No orders yet",
        ordersWillAppear: "Your orders will appear here",
        noCompletedOrders: "No Completed Orders",
        deliveredOrdersAppear: "Delivered orders will appear here",
        failedToLoadCompletedOrders: "Failed to load completed orders",
        pleaseTryAgain: "Please try again",
        retry: "Retry",
        noNotificationsYet: "No notifications",
        notificationsWillAppear: "Your notifications will appear here",
        noShopsAdded: "No shops added yet",
        addFirstShop: "Add your first partner shop",
        
        // Stats & Numbers
        totalAmount: "Total Amount",
        earnings: "Earnings",
        orderCount: "Order Count",
        deliveryFee: "Delivery Fee",
        
        // Notification Actions
        confirm: "Confirm",
        dismiss: "Dismiss",
        viewNotification: "View Notification",
        confirmDelivery: "Confirm Delivery",
        
        // Time & Date
        timeAgo: "ago",
        second: "second",
        seconds: "seconds",
        minute: "minute", 
        minutes: "minutes",
        hour: "hour",
        hours: "hours",
        day: "day",
        days: "days",
        
        // Validation Messages
        requiredField: "This field is required",
        invalidEmail: "Invalid email address",
        invalidPhone: "Invalid phone number",
        invalidAmount: "Invalid amount",
        pleaseSelectCategory: "Please select a category",
        pleaseAddShops: "Please add at least one shop before creating orders",
        noCategoriesAvailable: "No categories available. Please contact admin.",
        
        // Settings Labels
        earningsPerOrderLabel: "Earnings Per Order",
        earningsPerOrderDesc: "Set your default earnings amount per delivery order",
        shopManagementLabel: "Shop Management", 
        shopManagementDesc: "Add and manage your partner shops",
        
        // Notification Settings Labels
        soundNotificationsLabel: "Sound Notifications",
        soundNotificationsDesc: "Play a sound when receiving new notifications",
        browserNotificationsLabel: "Browser Notifications",
        browserNotificationsDesc: "Show desktop notifications even when the app is in background",
        
        // Floating Button
        addOrderTooltip: "Add Order",
        clickToCreateOrder: "Click to create order",

        // Language Settings
        languageSettings: "Language Settings",
        languageSettingsDesc: "Choose your preferred language",
        currentLanguage: "Current Language",
        selectLanguage: "Select Language",
        english: "English",
        greek: "Greek",
        languageModal: "Language Selection"
    },
    
    gr: {
        // App Header
        appTitle: "Padoo Delivery",
        driverSubtitle: "Πίνακας Οδηγού",
        available: "Διαθέσιμος",
        busy: "Απασχολημένος",
        offline: "Εκτός Σύνδεσης",
        
        // Navigation
        home: "Αρχική",
        orders: "Παραγγελίες",
        history: "Ιστορικό",
        notifications: "Ειδοποιήσεις",
        settings: "Ρυθμίσεις",
        profile: "Προφίλ",
        recent: "Πρόσφατα",
        teamMembers: "Μέλη Ομάδας",
        teamMembersManagement: "Διαχείριση Μελών Ομάδας",
        
        // Home Page
        driverDashboard: "Πίνακας Ελέγχου Οδηγού",
        currentDate: "Τρέχουσα Ημερομηνία",
        totalEarnings: "Συνολικά Κέρδη",
        totalOrders: "Συνολικές Παραγγελίες",
        todaysOrders: "Σημερινές Παραγγελίες",
        
        // Quick Actions
        quickActions: "Γρήγορες Ενέργειες",
        addOrder: "Προσθήκη Παραγγελίας",
        viewOrders: "Προβολή Παραγγελιών",
        checkNotifications: "Έλεγχος Ειδοποιήσεων",
        
        // Recent Orders
        recentOrders: "Πρόσφατες Παραγγελίες",
        yourLatestOrders: "Οι πιο πρόσφατες παραγγελίες σας",
        noRecentOrders: "Δεν υπάρχουν πρόσφατες παραγγελίες",
        viewAllOrders: "Προβολή Όλων των Παραγγελιών",
        
        // Partner Shops
        partnerShops: "Συνεργαζόμενα Καταστήματα",
        noPartnerShops: "Δεν έχουν προστεθεί συνεργαζόμενα καταστήματα ακόμα",
        addNewShop: "Προσθήκη Νέου Καταστήματος",
        viewAllShops: "Προβολή Όλων των Καταστημάτων",
        
        // Orders Page
        allOrders: "Όλες οι Παραγγελίες",
        filterOrders: "Φιλτράρισμα Παραγγελιών",
        all: "Όλες",
        today: "Σήμερα",
        week: "Αυτή η Εβδομάδα",
        month: "Αυτός ο Μήνας",
        noOrders: "Δεν βρέθηκαν παραγγελίες",
        orderDetails: "Λεπτομέρειες Παραγγελίας",
        completedOrders: "Ολοκληρωμένες Παραγγελίες",
        allDeliveredOrdersWithDriverInfo: "Όλες οι παραδομένες παραγγελίες με στοιχεία οδηγού",
        manageYourDeliveryOrders: "Διαχειριστείτε τις παραγγελίες παράδοσης",
        // Επικεφαλίδες και καταστάσεις σελίδας Παραγγελιών
        activeOrders: "Ενεργές Παραγγελίες",
        liveOrders: "Ζωντανές Παραγγελίες",
        availableOrdersFromYourShops: "Διαθέσιμες παραγγελίες από τα καταστήματά σου",
        noOrdersAvailable: "Δεν υπάρχουν διαθέσιμες παραγγελίες",
        noActiveOrders: "Δεν υπάρχουν ενεργές παραγγελίες",
        activeOrdersAppear: "Οι παραγγελίες που εκτελείς θα εμφανιστούν εδώ",
        noCompletedOrders24h: "Δεν υπάρχουν ολοκληρωμένες παραγγελίες τις τελευταίες 24 ώρες",
        completedDeliveriesAppear: "Οι ολοκληρωμένες παραδόσεις των τελευταίων 24 ωρών θα εμφανιστούν εδώ",
        
        // Notifications Page
        allNotifications: "Όλες οι Ειδοποιήσεις",
        noNotifications: "Δεν υπάρχουν ειδοποιήσεις",
        markAsRead: "Σήμανση ως Διαβασμένο",
        clearAll: "Εκκαθάριση Όλων",
        newNotification: "Νέα ειδοποίηση",
        
        // Settings Page
        settingsTitle: "Ρυθμίσεις",
        
        // Language Settings
        languageSettings: "Ρυθμίσεις Γλώσσας",
        languageSettingsDesc: "Επιλέξτε την προτιμώμενη γλώσσα σας",
        currentLanguage: "Τρέχουσα Γλώσσα",
        english: "Αγγλικά",
        greek: "Ελληνικά",
        changeLanguage: "Αλλαγή Γλώσσας",
        
        // Notification Settings
        notificationSettings: "Ρυθμίσεις Ειδοποιήσεων",
        notificationSettingsDesc: "Διαμορφώστε πώς λαμβάνετε ειδοποιήσεις από καταστήματα",
        soundNotifications: "Ηχητικές Ειδοποιήσεις",
        soundNotificationsDesc: "Αναπαραγωγή ήχου κατά τη λήψη νέων ειδοποιήσεων",
        browserNotifications: "Ειδοποιήσεις Προγράμματος Περιήγησης",
        browserNotificationsDesc: "Εμφάνιση ειδοποιήσεων επιφάνειας εργασίας ακόμα και όταν η εφαρμογή είναι στο παρασκήνιο",
        enabled: "Ενεργοποιημένο",
        disabled: "Απενεργοποιημένο",
        testSound: "Δοκιμή Ήχου",
        enable: "Ενεργοποίηση",
        blocked: "Αποκλεισμένο από τον Φυλλομετρητή",
        
        // Earnings Settings
        earningsSettings: "Ρυθμίσεις Κερδών",
        earningsSettingsDesc: "Διαμορφώστε τα κέρδη σας ανά παραγγελία",
        earningsPerOrder: "Κέρδη ανά Παραγγελία",
        defaultEarnings: "Προεπιλεγμένα Κέρδη",
        saveSettings: "Αποθήκευση Ρυθμίσεων",
        
        // Shop Management
        shopManagement: "Διαχείριση Καταστημάτων",
        shopManagementDesc: "Προσθέστε και διαχειριστείτε τα συνεργαζόμενα καταστήματά σας",
        searchShops: "Αναζήτηση καταστημάτων...",
        addShop: "Προσθήκη Καταστήματος",
        editShop: "Επεξεργασία Καταστήματος",
        deleteShop: "Διαγραφή Καταστήματος",
        
        // Profile Page
        profileTitle: "Προφίλ",
        profileName: "Όνομα Οδηγού",
        profileEmail: "Email",
        logout: "Αποσύνδεση",
        changePassword: "Αλλαγή Κωδικού",
        accountInfo: "Στοιχεία Λογαριασμού",
        memberSince: "Μέλος Από",
        perOrder: "Ανά Παραγγελία",
        account: "Λογαριασμός",
        support: "Υποστήριξη",
        helpCenter: "Κέντρο Βοήθειας",
        announcementsTitle: "Ανακοινώσεις",
        announcementsDesc: "Σημαντικές ενημερώσεις από διαχειριστές",
        analytics: "Στατιστικά",
        analyticsDesc: "Στατιστικά και μετρήσεις (σύντομα)",
        accountAndPreferences: "Λογαριασμός και προτιμήσεις",
        
        // Modals
        addOrderModal: "Προσθήκη Νέας Παραγγελίας",
        addShopModal: "Προσθήκη Νέου Καταστήματος",
        editShopModal: "Επεξεργασία Καταστήματος",
        shopName: "Όνομα Καταστήματος",
        shopCategory: "Κατηγορία",
        selectCategory: "Επιλογή Κατηγορίας",
        orderAmount: "Ποσό Παραγγελίας",
        customerName: "Όνομα Πελάτη",
        customerPhone: "Τηλέφωνο Πελάτη",
        deliveryAddress: "Διεύθυνση Παράδοσης",
        notes: "Σημειώσεις",
        save: "Αποθήκευση",
        cancel: "Ακύρωση",
        delete: "Διαγραφή",
        confirm: "Επιβεβαίωση",
        
        // Toast Messages
        settingsSaved: "Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς",
        languageChanged: "Η γλώσσα άλλαξε επιτυχώς",
        soundEnabled: "Οι ηχητικές ειδοποιήσεις ενεργοποιήθηκαν",
        soundDisabled: "Οι ηχητικές ειδοποιήσεις απενεργοποιήθηκαν",
        browserNotificationsEnabled: "Οι ειδοποιήσεις προγράμματος περιήγησης ενεργοποιήθηκαν",
        orderAdded: "Η παραγγελία προστέθηκε επιτυχώς",
        orderUpdated: "Η παραγγελία ενημερώθηκε επιτυχώς",
        orderDeleted: "Η παραγγελία διαγράφηκε επιτυχώς",
        orderCompleted: "Η παραγγελία ολοκληρώθηκε επιτυχώς",
        orderAccepted: "Η παραγγελία έγινε αποδεκτή επιτυχώς",
        shopAdded: "Το κατάστημα προστέθηκε επιτυχώς",
        shopUpdated: "Το κατάστημα ενημερώθηκε επιτυχώς",
        shopDeleted: "Το κατάστημα διαγράφηκε επιτυχώς",
        notificationDeleted: "Η ειδοποίηση διαγράφηκε επιτυχώς",
        notificationUpdated: "Η ειδοποίηση ενημερώθηκε επιτυχώς",
        notificationConfirmed: "Η ειδοποίηση επιβεβαιώθηκε επιτυχώς",
        loggedOut: "Αποσυνδεθήκατε με επιτυχία",
        errorOccurred: "Παρουσιάστηκε σφάλμα",
        failedToSaveSettings: "Αποτυχία αποθήκευσης ρυθμίσεων",
        pleaseSelectShop: "Παρακαλώ επιλέξτε κατάστημα",
        pleaseEnterValidOrderPrice: "Παρακαλώ εισάγετε έγκυρη τιμή παραγγελίας",
        pleaseEnterValidPrice: "Παρακαλώ εισάγετε έγκυρη τιμή",
        pleaseEnterValidPricePaid: "Παρακαλώ εισάγετε έγκυρη τιμή (0 ή μεγαλύτερη για πληρωμένες παραγγελίες)",
        pleaseEnterValidTime: "Παρακαλώ εισάγετε έγκυρο χρόνο μεταξύ 1-120 λεπτών",
        failedToCompleteOrder: "Αποτυχία ολοκλήρωσης παραγγελίας",
        failedToAcceptOrder: "Αποτυχία αποδοχής παραγγελίας",
        failedToDeleteOrder: "Αποτυχία διαγραφής παραγγελίας",
        failedToUpdateOrder: "Αποτυχία ενημέρωσης παραγγελίας",
        failedToAddOrder: "Αποτυχία προσθήκης παραγγελίας",
        failedToAddShop: "Αποτυχία προσθήκης καταστήματος",
        failedToLoadNotifications: "Αποτυχία φόρτωσης ειδοποιήσεων",
        sessionExpired: "Η συνεδρία έληξε. Παρακαλώ συνδεθείτε ξανά.",
        
        // Time Formatting
        justNow: "Μόλις τώρα",
        minutesAgo: "λεπτά πριν",
        hoursAgo: "ώρες πριν",
        daysAgo: "μέρες πριν",
        recently: "Πρόσφατα",
        
        // Common Actions
        close: "Κλείσιμο",
        back: "Πίσω",
        next: "Επόμενο",
        previous: "Προηγούμενο",
        loading: "Φόρτωση...",
        retry: "Επανάληψη",
        
        // Error Messages
        failedToLoad: "Αποτυχία φόρτωσης. Παρακαλώ δοκιμάστε ξανά αργότερα.",
        connectionError: "Σφάλμα σύνδεσης. Παρακαλώ ελέγξτε τη σύνδεσή σας στο διαδίκτυο.",
        
        // Success Messages
        operationCompleted: "Η λειτουργία ολοκληρώθηκε επιτυχώς",
        dataSaved: "Τα δεδομένα αποθηκεύτηκαν επιτυχώς",
        
        // Confirmation Messages
        confirmDelete: "Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το στοιχείο;",
        confirmLogout: "Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε;",
        
        // Back Button Messages
        useLogoutButton: "Παρακαλώ χρησιμοποιήστε το κουμπί αποσύνδεσης για έξοδο από την εφαρμογή",
        backDisabled: "Το κουμπί επιστροφής είναι απενεργοποιημένο για λόγους ασφαλείας",
        cannotExit: "Δεν μπορείτε να εξέλθετε από την εφαρμογή χρησιμοποιώντας το κουμπί επιστροφής",

        // Form Fields & Placeholders
        searchPlaceholder: "Αναζήτηση...",
        enterAmount: "Εισάγετε ποσό",
        enterOrderPrice: "Εισάγετε τιμή παραγγελίας",
        enterCustomerName: "Εισάγετε όνομα πελάτη",
        enterCustomerPhone: "Εισάγετε τηλέφωνο πελάτη",
        enterDeliveryAddress: "Εισάγετε διεύθυνση παράδοσης",
        enterNotes: "Εισάγετε σημειώσεις",
        enterShopName: "Εισάγετε όνομα καταστήματος",
        selectCategoryPlaceholder: "Επιλέξτε κατηγορία",
        
        // Modal Titles & Content
        selectCategoryTitle: "Επιλογή Κατηγορίας",
        selectCategoryDesc: "Επιλέξτε την κατηγορία για την παραγγελία σας",
        addOrderTitle: "Προσθήκη Νέας Παραγγελίας",
        editOrderTitle: "Επεξεργασία Παραγγελίας",
        orderDetailsTitle: "Λεπτομέρειες Παραγγελίας",
        confirmDeleteTitle: "Επιβεβαίωση Διαγραφής",
        confirmDeleteDesc: "Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το στοιχείο; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.",
        
        // Form Labels
        category: "Κατηγορία",
        price: "Τιμή",
        customer: "Πελάτης",
        phone: "Τηλέφωνο",
        address: "Διεύθυνση",
        paymentMethod: "Μέθοδος Πληρωμής",
        cash: "Μετρητά",
        paid: "Πληρωμένο",
        
        // Buttons & Actions
        addOrder: "Προσθήκη Παραγγελίας",
        editOrder: "Επεξεργασία Παραγγελίας",
        saveOrder: "Αποθήκευση Παραγγελίας",
        updateOrder: "Ενημέρωση Παραγγελίας",
        cancelOrder: "Ακύρωση Παραγγελίας",
        deleteOrder: "Διαγραφή Παραγγελίας",
        viewDetails: "Προβολή Λεπτομερειών",
        markComplete: "Σήμανση ως Ολοκληρωμένο",
        
        // Shop Management
        addPartnerShop: "Προσθήκη Συνεργαζόμενου Καταστήματος",
        editPartnerShop: "Επεξεργασία Συνεργαζόμενου Καταστήματος",
        deletePartnerShop: "Διαγραφή Συνεργαζόμενου Καταστήματος",
        manageShops: "Διαχείριση Καταστημάτων",
        shopDetails: "Λεπτομέρειες Καταστήματος",
        
        // Status Messages
        processing: "Επεξεργασία...",
        saving: "Αποθήκευση...",
        deleting: "Διαγραφή...",
        updating: "Ενημέρωση...",
        completed: "Ολοκληρώθηκε",
        pending: "Εκκρεμεί",
        accepted: "Αποδεκτές",
        confirmed: "Επιβεβαιώθηκε",
        cancelled: "Ακυρώθηκε",
        
        // Quick Actions
        addNewOrder: "Προσθήκη Νέας Παραγγελίας",
        recordDelivery: "Καταγραφή νέας παραγγελίας παράδοσης",
        managePartnerShops: "Διαχείριση Συνεργαζόμενων Καταστημάτων",
        addEditShops: "Προσθήκη ή επεξεργασία συνεργαζόμενων καταστημάτων",
        recentActivity: "Πρόσφατη Δραστηριότητα",
        
        // Empty States
        noOrdersYet: "Δεν υπάρχουν παραγγελίες ακόμα",
        ordersWillAppear: "Οι παραγγελίες σας θα εμφανιστούν εδώ",
        noCompletedOrders: "Δεν υπάρχουν ολοκληρωμένες παραγγελίες",
        deliveredOrdersAppear: "Οι παραδομένες παραγγελίες θα εμφανιστούν εδώ",
        failedToLoadCompletedOrders: "Αποτυχία φόρτωσης ολοκληρωμένων παραγγελιών",
        pleaseTryAgain: "Παρακαλώ δοκιμάστε ξανά",
        retry: "Επανάληψη",
        noNotificationsYet: "Δεν υπάρχουν ειδοποιήσεις",
        notificationsWillAppear: "Οι ειδοποιήσεις σας θα εμφανιστούν εδώ",
        noShopsAdded: "Δεν έχουν προστεθεί καταστήματα ακόμα",
        addFirstShop: "Προσθέστε το πρώτο σας συνεργαζόμενο κατάστημα",
        
        // Stats & Numbers
        totalAmount: "Συνολικό Ποσό",
        earnings: "Κέρδη",
        orderCount: "Αριθμός Παραγγελιών",
        deliveryFee: "Τέλος Παράδοσης",
        
        // Notification Actions
        confirm: "Επιβεβαίωση",
        dismiss: "Απόρριψη",
        viewNotification: "Προβολή Ειδοποίησης",
        confirmDelivery: "Επιβεβαίωση Παράδοσης",
        
        // Time & Date
        timeAgo: "πριν",
        second: "δευτερόλεπτο",
        seconds: "δευτερόλεπτα",
        minute: "λεπτό",
        minutes: "λεπτά",
        hour: "ώρα",
        hours: "ώρες",
        day: "ημέρα",
        days: "ημέρες",
        
        // Validation Messages
        requiredField: "Αυτό το πεδίο είναι υποχρεωτικό",
        invalidEmail: "Μη έγκυρη διεύθυνση email",
        invalidPhone: "Μη έγκυρος αριθμός τηλεφώνου",
        invalidAmount: "Μη έγκυρο ποσό",
        pleaseSelectCategory: "Παρακαλώ επιλέξτε κατηγορία",
        pleaseAddShops: "Παρακαλώ προσθέστε τουλάχιστον ένα κατάστημα πριν δημιουργήσετε παραγγελίες",
        noCategoriesAvailable: "Δεν υπάρχουν διαθέσιμες κατηγορίες. Παρακαλώ επικοινωνήστε με τον διαχειριστή.",
        
        // Settings Labels
        earningsPerOrderLabel: "Κέρδη ανά Παραγγελία",
        earningsPerOrderDesc: "Ορίστε το προεπιλεγμένο ποσό κερδών ανά παραγγελία παράδοσης",
        shopManagementLabel: "Διαχείριση Καταστημάτων",
        shopManagementDesc: "Προσθέστε και διαχειριστείτε τα συνεργαζόμενα καταστήματά σας",
        
        // Notification Settings Labels
        soundNotificationsLabel: "Ηχητικές Ειδοποιήσεις",
        soundNotificationsDesc: "Αναπαραγωγή ήχου κατά τη λήψη νέων ειδοποιήσεων",
        browserNotificationsLabel: "Ειδοποιήσεις Προγράμματος Περιήγησης",
        browserNotificationsDesc: "Εμφάνιση ειδοποιήσεων επιφάνειας εργασίας ακόμα και όταν η εφαρμογή είναι στο παρασκήνιο",
        
        // Floating Button
        addOrderTooltip: "Προσθήκη Παραγγελίας",
        clickToCreateOrder: "Πατήστε για δημιουργία παραγγελίας",

        // Language Settings
        languageSettings: "Ρυθμίσεις Γλώσσας",
        languageSettingsDesc: "Επιλέξτε την προτιμώμενη γλώσσα",
        currentLanguage: "Τρέχουσα Γλώσσα",
        selectLanguage: "Επιλογή Γλώσσας",
        english: "Αγγλικά",
        greek: "Ελληνικά",
        languageModal: "Επιλογή Γλώσσας"
    }
};

// Translation manager class
class TranslationManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('app_language') || 'en';
        this.translations = translations;
        this.observers = [];
    }
    
    // Get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    // Set language and notify observers
    async setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            localStorage.setItem('app_language', language);
            
            // Update user settings in database
            try {
                await this.updateUserLanguageSettings(language);
            } catch (error) {
                console.error('Failed to update language in database:', error);
            }
            
            // Notify all observers
            this.notifyObservers();
            
            return true;
        }
        return false;
    }
    
    // Get translation for a key
    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            value = value && value[k];
        }
        
        return value || key;
    }
    
    // Add observer for language changes
    addObserver(callback) {
        this.observers.push(callback);
    }
    
    // Remove observer
    removeObserver(callback) {
        this.observers = this.observers.filter(obs => obs !== callback);
    }
    
    // Notify all observers
    notifyObservers() {
        this.observers.forEach(callback => callback(this.currentLanguage));
    }
    
    // Update user language settings in database
    async updateUserLanguageSettings(language) {
        try {
            // Get session token from the app instance or localStorage
            let sessionToken = window.deliveryApp?.sessionToken || localStorage.getItem('deliveryAppSession') || window.shopApp?.sessionToken;
            if (!sessionToken) {
                try {
                    const ss = localStorage.getItem('shopSession');
                    if (ss) sessionToken = JSON.parse(ss).sessionToken;
                } catch (e) {}
            }
            if (!sessionToken) {
                sessionToken = localStorage.getItem('deliveryAppShopSession');
            }

            if (!sessionToken) {
                console.warn('No session token available, skipping database update');
                return { success: true, message: 'Language updated locally' };
            }
            
            const response = await fetch('/api/user/settings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`
                },
                body: JSON.stringify({ language })
            });

            if (response.status === 401) {
                console.warn('Language settings update unauthorized (session likely expired). Keeping local change.');
                return { success: true, message: 'Language updated locally (not persisted - please re-login)' };
            }

            if (!response.ok) {
                throw new Error('Failed to update language settings');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error updating language settings:', error);
            throw error;
        }
    }
    
    // Load user language settings from database
    async loadUserLanguageSettings() {
        try {
            // Get session token from the app instance or localStorage
            let sessionToken = window.deliveryApp?.sessionToken || localStorage.getItem('deliveryAppSession') || window.shopApp?.sessionToken;
            if (!sessionToken) {
                try {
                    const ss = localStorage.getItem('shopSession');
                    if (ss) sessionToken = JSON.parse(ss).sessionToken;
                } catch (e) {}
            }
            if (!sessionToken) {
                sessionToken = localStorage.getItem('deliveryAppShopSession');
            }

            if (!sessionToken) {
                console.warn('No session token available, using local language settings');
                return;
            }
            
            const response = await fetch('/api/user/settings', {
                headers: {
                    'Authorization': `Bearer ${sessionToken}`
                }
            });
            
            if (response.ok) {
                const settings = await response.json();
                if (settings.language && settings.language !== this.currentLanguage) {
                    this.currentLanguage = settings.language;
                    localStorage.setItem('app_language', settings.language);
                    this.notifyObservers();
                }
            }
        } catch (error) {
            console.error('Error loading language settings:', error);
        }
    }
    
    // Initialize translation system
    async init() {
        // Load user settings from database
        await this.loadUserLanguageSettings();
        
        // Apply initial translations
        this.applyTranslations();
    }
    
    // Apply translations to all elements with data-translate attribute
    applyTranslations() {
        // Translate elements with data-translate attributes
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.t(key);
            
            if (element.getAttribute('data-translate-attr')) {
                const attr = element.getAttribute('data-translate-attr');
                element.setAttribute(attr, translation);
            } else {
                element.textContent = translation;
            }
        });

        // Translate placeholder texts
        this.translatePlaceholders();
        
        // Translate tooltips and titles
        this.translateTooltips();
        
        // Translate button texts and labels
        this.translateButtons();
        
        // Translate form labels
        this.translateFormLabels();
        
        // Translate empty states and messages
        this.translateEmptyStates();
    }

    // Translate all placeholder texts
    translatePlaceholders() {
        // Search input placeholders
        const searchInputs = document.querySelectorAll('input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="🔍"]');
        searchInputs.forEach(input => {
            input.placeholder = this.t('searchPlaceholder');
        });

        // Specific placeholders by ID or class
        const placeholderMap = {
            'search-shops': 'searchShops',
            'order-amount': 'enterOrderPrice',
            'customer-name': 'enterCustomerName',
            'customer-phone': 'enterCustomerPhone',
            'delivery-address': 'enterDeliveryAddress',
            'order-notes': 'enterNotes',
            'shop-name': 'enterShopName'
        };

        Object.entries(placeholderMap).forEach(([id, key]) => {
            const element = document.getElementById(id);
            if (element) {
                element.placeholder = this.t(key);
            }
        });
    }

    // Translate tooltips and title attributes
    translateTooltips() {
        const tooltipMap = {
            'add-order-btn': 'addOrderTooltip',
            'floating-add-btn': 'addOrderTooltip'
        };

        Object.entries(tooltipMap).forEach(([id, key]) => {
            const element = document.getElementById(id);
            if (element) {
                element.title = this.t(key);
            }
        });
    }

    // Translate button texts
    translateButtons() {
        // Common button selectors and their translation keys
        const buttonSelectors = [
            { selector: '.btn.primary', textMap: {
                'Save Settings': 'saveSettings',
                'Add New Shop': 'addNewShop',
                'Add Shop': 'addShop',
                'Save': 'save',
                'Update': 'updateOrder',
                'Delete': 'delete',
                'Confirm': 'confirm',
                'Cancel': 'cancel'
            }},
            { selector: '.btn.secondary', textMap: {
                'Logout': 'logout',
                'Back': 'back',
                'Close': 'close'
            }},
            { selector: '.filter-btn', textMap: {
                'All': 'all',
                'Today': 'today',
                'This Week': 'week',
                'This Month': 'month'
            }}
        ];

        buttonSelectors.forEach(({ selector, textMap }) => {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach(button => {
                const currentText = button.textContent.trim();
                if (textMap[currentText]) {
                    button.textContent = this.t(textMap[currentText]);
                }
            });
        });
    }

    // Translate form labels
    translateFormLabels() {
        const labelMap = {
            'Default Earnings': 'defaultEarnings',
            'Earnings Per Order': 'earningsPerOrder',
            'Shop Name': 'shopName',
            'Category': 'category',
            'Price': 'price',
            'Customer Name': 'customerName',
            'Customer Phone': 'customerPhone',
            'Delivery Address': 'deliveryAddress',
            'Notes': 'notes',
            'Payment Method': 'paymentMethod'
        };

        const labels = document.querySelectorAll('label');
        labels.forEach(label => {
            const currentText = label.textContent.trim();
            if (labelMap[currentText]) {
                label.textContent = this.t(labelMap[currentText]);
            }
        });
    }

    // Translate empty states and loading messages
    translateEmptyStates() {
        // Loading messages
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(element => {
            if (element.textContent.includes('Loading')) {
                element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${this.t('loading')}`;
            }
        });

        // Empty state messages
        const emptyStates = [
            { selector: '.empty-state h3', textMap: {
                'No orders yet': 'noOrdersYet',
                'No notifications': 'noNotifications',
                'No Notifications': 'noNotifications'
            }},
            { selector: '.empty-state p', textMap: {
                'Your orders will appear here': 'ordersWillAppear',
                'Your notifications will appear here': 'notificationsWillAppear',
                "You don't have any notifications yet.": 'notificationsWillAppear'
            }}
        ];

        emptyStates.forEach(({ selector, textMap }) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const currentText = element.textContent.trim();
                if (textMap[currentText]) {
                    element.textContent = this.t(textMap[currentText]);
                }
            });
        });
    }

    // Helper method for translating dynamic content with fallback
    translateText(text, fallbackKey = null) {
        // Common text mappings for dynamic content
        const textMappings = {
            'Loading...': 'loading',
            'Processing...': 'processing',
            'Saving...': 'saving',
            'Deleting...': 'deleting',
            'Add Order': 'addOrder',
            'Edit Order': 'editOrder',
            'Delete Order': 'deleteOrder',
            'Confirm': 'confirm',
            'Cancel': 'cancel',
            'Save': 'save',
            'Close': 'close',
            'Back': 'back',
            'Next': 'next',
            'Previous': 'previous',
            'Retry': 'retry',
            'Just now': 'justNow',
            'Recently': 'recently',

            // Frequent toast messages
            '🎉 Order completed successfully!': 'orderCompleted',
            'Order completed successfully!': 'orderCompleted',
            '✅ Order accepted successfully!': 'orderAccepted',
            'Order accepted successfully!': 'orderAccepted',
            'Order updated successfully!': 'orderUpdated',
            'Order deleted successfully!': 'orderDeleted',
            'Notification deleted successfully!': 'notificationDeleted',
            'Notification updated successfully': 'notificationUpdated',
            '✅ Notification confirmed successfully': 'notificationConfirmed',
            'Logged out successfully': 'loggedOut',
            'Browser notifications enabled': 'browserNotificationsEnabled',

            // Frequent errors/validations
            'Failed to save settings': 'failedToSaveSettings',
            'Please select a shop': 'pleaseSelectShop',
            'Please enter a valid order price': 'pleaseEnterValidOrderPrice',
            'Please enter a valid price greater than 0': 'pleaseEnterValidPrice',
            'Please enter a valid price (0 or higher for paid orders)': 'pleaseEnterValidPricePaid',
            'Please enter a valid time between 1-120 minutes': 'pleaseEnterValidTime',
            'Failed to complete order': 'failedToCompleteOrder',
            'Failed to accept order': 'failedToAcceptOrder',
            'Failed to delete order': 'failedToDeleteOrder',
            'Failed to update order': 'failedToUpdateOrder',
            'Failed to add order': 'failedToAddOrder',
            'Failed to add shop': 'failedToAddShop',
            'Failed to load notifications': 'failedToLoadNotifications',
            'Session expired. Please log in again.': 'sessionExpired'
        };

        // Try direct mapping first
        if (textMappings[text]) {
            return this.t(textMappings[text]);
        }

        // Try fallback key
        if (fallbackKey) {
            return this.t(fallbackKey);
        }

        // Return original text if no translation found
        return text;
    }
}

// Create global translation manager instance
const i18n = new TranslationManager();

// Export for global use
window.i18n = i18n;
window.t = (key) => i18n.t(key); 