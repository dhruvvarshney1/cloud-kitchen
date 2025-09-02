
document.addEventListener("DOMContentLoaded", function () {
  const deliveryDateSelect = document.getElementById("delivery-date");
  const deliveryTimeSelect = document.getElementById("delivery-time");
  const menuOfTheDaySection = document.getElementById("menu-of-the-day");
  const dailyMenuItemsContainer = document.getElementById("daily-menu-items");
  const deliveryDetailsSection = document.getElementById("delivery-details");
  const scheduledOrderForm = document.getElementById("scheduled-order-form"); // Form ID remains the same
  const summaryItems = document.getElementById("summary-items");
  const subtotalElement = document.getElementById("subtotal");
  const totalElement = document.getElementById("total");
  const deliveryFeeElement = document.getElementById("delivery-fee");
  const deliveryFee = 30; // Define delivery fee

  // Sample Daily Menu Data (YYYY-MM-DD format for date keys)
  // Ensure your server/backend would provide this dynamically for a real application
  const dailyMenu = {
    "2025-05-12": {
      // Monday, May 12, 2025 (Today, based on example execution time)
      lunch: [
        {
          name: "Special Veg Thali (Lunch)",
          price: 100,
          description: "Rice, 2 Rotis, Dal, Mix Veg, Pickle, Salad",
        },
        {
          name: "Paneer Butter Masala Combo (Lunch)",
          price: 120,
          description: "Served with 2 Rotis or Rice",
        },
        {
          name: "Aloo Paratha Feast (Lunch)",
          price: 70,
          description: "2 Aloo Parathas with Curd & Pickle",
        },
      ],
      dinner: [
        {
          name: "Chef's Special Chicken Curry (Dinner)",
          price: 150,
          description: "Served with Rice or 2 Rotis",
        },
        {
          name: "Homestyle Dal Makhani Combo (Dinner)",
          price: 110,
          description: "Served with 2 Rotis or Rice",
        },
        {
          name: "Vegetable Pulao Delight (Dinner)",
          price: 90,
          description: "Served with Raita & Papad",
        },
      ],
    },
    "2025-05-13": {
      // Tuesday, May 13, 2025 (Tomorrow)
      lunch: [
        {
          name: "Rajma Chawal Special (Lunch)",
          price: 80,
          description: "Classic comfort meal",
        },
        {
          name: "Gobhi Paratha Platter (Lunch)",
          price: 60,
          description: "2 Gobhi Parathas with Curd & Pickle",
        },
        {
          name: "Veg Hakka Noodles (Lunch)",
          price: 70,
          description: "Stir-fried noodles with fresh vegetables",
        },
      ],
      dinner: [
        {
          name: "Paneer Bhurji & Roti (Dinner)",
          price: 100,
          description: "Spiced scrambled cottage cheese with 2 Rotis",
        },
        {
          name: "Mixed Vegetable Curry Combo (Dinner)",
          price: 90,
          description: "Seasonal vegetables in gravy with Rice",
        },
        {
          name: "Hyderabadi Chicken Biryani (Dinner)",
          price: 180,
          description: "Aromatic and flavorful biryani with Raita",
        },
      ],
    },
    "2025-05-14": {
      // Wednesday, May 14, 2025 (Day after Tomorrow for testing)
      lunch: [
        {
          name: "Chole Bhature (Lunch)",
          price: 90,
          description: "Spicy chickpeas with 2 fluffy bhaturas",
        },
        {
          name: "Lemon Rice with Coconut Chutney (Lunch)",
          price: 75,
          description: "Tangy and light South Indian specialty",
        },
        {
          name: "Veggie Delight Sandwich (Lunch)",
          price: 65,
          description: "Grilled sandwich with fresh veggies and cheese",
        },
      ],
      dinner: [
        {
          name: "Egg Curry with Paratha (Dinner)",
          price: 110,
          description: "Homestyle egg curry with 2 parathas",
        },
        {
          name: "Dal Tadka with Jeera Rice (Dinner)",
          price: 95,
          description: "Yellow lentils with tempered spices",
        },
        {
          name: "Mushroom Masala with Naan (Dinner)",
          price: 130,
          description: "Spicy mushroom gravy with 1 Naan",
        },
      ],
    },
  };

  // Populate delivery date options (Today, Tomorrow, Day After Tomorrow)
  function populateDeliveryDates() {
    const today = new Date();
    deliveryDateSelect.innerHTML =
      '<option value="">-- Select a Date --</option>'; // Add a default option

    for (let i = 0; i < 3; i++) {
      // Show today and next 2 days
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD

      let dayLabel = "Today";
      if (i === 1) dayLabel = "Tomorrow";
      if (i > 1)
        dayLabel = date.toLocaleDateString("en-US", { weekday: "long" });

      const optionText = `${dayLabel} (${date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })})`;
      deliveryDateSelect.innerHTML += `
        <option value="${dateString}">${optionText}</option>
      `;
    }
  }

  populateDeliveryDates();

  // Function to render the menu for the selected date and time
  function renderMenu(date, time) {
    dailyMenuItemsContainer.innerHTML = ""; // Clear previous menu items
    menuOfTheDaySection.classList.add("hidden"); // Hide by default

    if (!date || !time) {
      // If no date or time slot selected for daily menu
      // Potentially show general menu items here if that functionality is added
      // For now, we just ensure the daily menu is not shown.
      updateOrderSummary(); // Update summary (it will be empty or just delivery fee)
      return;
    }

    const menuForDay = dailyMenu[date];
    if (!menuForDay || !menuForDay[time]) {
      dailyMenuItemsContainer.innerHTML =
        "<p>No special daily menu available for this slot. Please call us for other options or try a different slot.</p>";
      menuOfTheDaySection.classList.remove("hidden");
      updateOrderSummary();
      return;
    }

    const menuItems = menuForDay[time];
    if (menuItems.length === 0) {
      dailyMenuItemsContainer.innerHTML =
        "<p>No items on the special daily menu for this slot.</p>";
      menuOfTheDaySection.classList.remove("hidden");
      updateOrderSummary();
      return;
    }

    menuItems.forEach((item, index) => {
      const menuItemDiv = document.createElement("div");
      menuItemDiv.classList.add("menu-item");
      menuItemDiv.innerHTML = `
        <input type="checkbox" id="item-${time}-${index}" data-price="${
        item.price
      }" data-name="${item.name}">
        <label for="item-${time}-${index}">${item.name} - Rs. ${
        item.price
      }</label>
        ${
          item.description
            ? `<p class="item-description">${item.description}</p>`
            : ""
        }
        <div class="quantity-selector hidden">
          <label for="quantity-${time}-${index}">Quantity:</label>
          <input type="number" id="quantity-${time}-${index}" name="quantity-${
        item.name
      }" min="1" value="1" class="item-quantity">
        </div>
      `;
      dailyMenuItemsContainer.appendChild(menuItemDiv);

      const checkbox = menuItemDiv.querySelector(`#item-${time}-${index}`);
      const quantitySelector = menuItemDiv.querySelector(".quantity-selector");
      const quantityInput = menuItemDiv.querySelector(".item-quantity");

      checkbox.addEventListener("change", function () {
        if (this.checked) {
          quantitySelector.classList.remove("hidden");
        } else {
          quantitySelector.classList.add("hidden");
          quantityInput.value = 1; // Reset quantity when unchecked
        }
        updateOrderSummary();
        // Show delivery details if at least one item is checked
        deliveryDetailsSection.classList.toggle("hidden", !hasSelectedItems());
      });

      quantityInput.addEventListener("change", updateOrderSummary);
      quantityInput.addEventListener("input", updateOrderSummary);
    });

    menuOfTheDaySection.classList.remove("hidden");
    // Show delivery details if a menu is rendered and items might be selected
    deliveryDetailsSection.classList.toggle("hidden", !hasSelectedItems());
    updateOrderSummary();
  }

  function hasSelectedItems() {
    return (
      dailyMenuItemsContainer.querySelector(
        '.menu-item input[type="checkbox"]:checked'
      ) !== null
    );
  }

  // Update order summary based on selected items and quantities
  function updateOrderSummary() {
    let subtotal = 0;
    let summaryHTML = "";
    const selectedItems = dailyMenuItemsContainer.querySelectorAll(
      '.menu-item input[type="checkbox"]:checked'
    );

    selectedItems.forEach((item) => {
      const itemName = item.dataset.name;
      const itemPrice = parseInt(item.dataset.price);
      const quantityInput = item
        .closest(".menu-item")
        .querySelector(".item-quantity");
      const quantity = parseInt(quantityInput.value) || 1;

      subtotal += itemPrice * quantity;
      summaryHTML += `<p>${itemName} (x${quantity}) <span>Rs. ${
        itemPrice * quantity
      }</span></p>`;
    });

    summaryItems.innerHTML = summaryHTML || "<p>No items selected yet.</p>";
    subtotalElement.textContent = `Rs. ${subtotal}`;

    if (subtotal > 0) {
      totalElement.textContent = `Rs. ${subtotal + deliveryFee}`;
      deliveryFeeElement.textContent = `Rs. ${deliveryFee}`;
    } else {
      totalElement.textContent = `Rs. 0`; // Or hide total if nothing selected
      deliveryFeeElement.textContent = `Rs. 0`;
    }
  }

  // Event listeners for date and time selection
  deliveryDateSelect.addEventListener("change", function () {
    const selectedDate = this.value;
    const selectedTime = deliveryTimeSelect.value;
    if (selectedDate && selectedTime) {
      // Only render if both date and time slot for daily menu are selected
      renderMenu(selectedDate, selectedTime);
    } else if (selectedDate && !selectedTime) {
      // Date selected, but no time slot (yet)
      menuOfTheDaySection.classList.add("hidden"); // Hide daily menu
      dailyMenuItemsContainer.innerHTML = ""; // Clear daily menu items
      deliveryDetailsSection.classList.remove("hidden"); // Show delivery details as user might order from general menu (future) or call
    } else {
      // No date selected
      menuOfTheDaySection.classList.add("hidden");
      deliveryDetailsSection.classList.add("hidden");
      dailyMenuItemsContainer.innerHTML = "";
    }
    updateOrderSummary(); // Update summary regardless
  });

  deliveryTimeSelect.addEventListener("change", function () {
    const selectedTime = this.value;
    const selectedDate = deliveryDateSelect.value;

    if (selectedDate && selectedTime) {
      // If a specific time slot for daily menu is chosen
      renderMenu(selectedDate, selectedTime);
      deliveryDetailsSection.classList.remove("hidden"); // Ensure delivery details are visible
    } else if (selectedDate && !selectedTime) {
      // Date selected, but "select time slot" chosen
      menuOfTheDaySection.classList.add("hidden");
      dailyMenuItemsContainer.innerHTML = ""; // Clear daily menu items
      // Delivery details should remain visible if a date is selected
      deliveryDetailsSection.classList.remove("hidden");
    } else {
      // No date or no time slot
      menuOfTheDaySection.classList.add("hidden");
      // deliveryDetailsSection.classList.add("hidden"); // Hide if no date either
      dailyMenuItemsContainer.innerHTML = "";
    }
    updateOrderSummary();
  });

  // Form submission handling
  scheduledOrderForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const selectedDateValue = deliveryDateSelect.value;
    if (!selectedDateValue) {
      alert("Please select a delivery date.");
      return;
    }

    const selectedDailyMenuItems = dailyMenuItemsContainer.querySelectorAll(
      '.menu-item input[type="checkbox"]:checked'
    );

    // In a more complex system, you might check for items from a general menu too.
    // For now, we require items if a daily menu was supposed to be shown.
    if (deliveryTimeSelect.value && selectedDailyMenuItems.length === 0) {
      alert(
        "Please select at least one menu item from the daily menu, or clear the time slot if ordering differently."
      );
      return;
    }
    // If no time slot is selected, we assume they might be calling or a general menu would be here.
    // For now, if no items are selected at all from any source (currently only daily menu), prevent submission.
    if (selectedDailyMenuItems.length === 0) {
      alert("Please select at least one menu item to order.");
      return;
    }

    const deliveryDate = deliveryDateSelect.value;
    const deliveryTime = deliveryTimeSelect.value || "ASAP/General"; // Default if no specific slot
    const customerName = document.getElementById("scheduled-name").value;
    const customerPhone = document.getElementById("scheduled-phone").value;
    const deliveryAddress = document.getElementById("scheduled-address").value;
    const specialInstructions = document.getElementById(
      "special-instructions"
    ).value;

    const orderItems = [];
    selectedDailyMenuItems.forEach((item) => {
      const itemName = item.dataset.name;
      const itemPrice = parseInt(item.dataset.price);
      const quantityInput = item
        .closest(".menu-item")
        .querySelector(".item-quantity");
      const quantity = parseInt(quantityInput.value) || 1;
      orderItems.push({ name: itemName, quantity: quantity, price: itemPrice });
    });

    const orderDetails = {
      date: deliveryDate,
      timeSlot: deliveryTime, // Clarify this is the time slot for daily menu
      customer: {
        name: customerName,
        phone: customerPhone,
        address: deliveryAddress,
      },
      items: orderItems,
      instructions: specialInstructions,
      subtotal: subtotalElement.textContent,
      deliveryFee: deliveryFeeElement.textContent,
      total: totalElement.textContent,
    };

    console.log("Order Details:", orderDetails);

    // In a real implementation, this would send orderDetails to a server
    // For example: fetch('/api/place-order', { method: 'POST', body: JSON.stringify(orderDetails), headers: {'Content-Type': 'application/json'} })
    alert(
      `Your order for ${deliveryDate} (${deliveryTime}) has been placed! Total: ${orderDetails.total}. You will receive an SMS confirmation shortly (simulation).`
    );

    this.reset();
    menuOfTheDaySection.classList.add("hidden");
    deliveryDetailsSection.classList.add("hidden");
    dailyMenuItemsContainer.innerHTML = "";
    deliveryTimeSelect.value = ""; // Reset time slot
    populateDeliveryDates(); // Repopulate dates and set to default
    deliveryDateSelect.value = ""; // Reset date select to default
    updateOrderSummary();
  });

  // Initial population and state
  populateDeliveryDates();
  updateOrderSummary(); // Initialize summary (will show Rs. 0)
  // Initially hide menu and delivery details until a date is selected
  menuOfTheDaySection.classList.add("hidden");
  deliveryDetailsSection.classList.add("hidden");
});
