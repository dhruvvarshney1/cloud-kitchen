document.addEventListener("DOMContentLoaded", () => {
	const orders = new Map();

	const orderStatuses = [
		{ text: "Order Placed", step: 1 },
		{ text: "Preparing Your Meal", step: 2 },
		{ text: "Out for Delivery", step: 3 },
		{ text: "Delivered", step: 4 },
	];

	let trackingIntervalId = null;
	let trackingOrderId = null;

	const placeOrderForm = document.getElementById("place-order-form");
	const trackOrderForm = document.getElementById("track-order-form");
	const contactForm = document.getElementById("contact-form");
	const orderModal = document.getElementById("order-modal");
	const modalCloseButton = orderModal?.querySelector(".home-modal__close");
	const newOrderIdSpan = document.getElementById("new-order-id");
	const orderStatusContainer = document.getElementById("home-order-status");
	const currentStatusText = document.getElementById("home-current-status");
	const progressSteps = Array.from(
		document.querySelectorAll(".home-progress__step")
	);
	const trackErrorMessage = document.getElementById("home-track-error");
	const orderIdInput = document.getElementById("order-id-input");
	const dishSelect = document.getElementById("dish");
	const qtyInput = document.getElementById("qty");
	const addressInput = document.getElementById("address");
	const phoneInput = document.getElementById("phone");

	function populateDishOptions() {
		const menuTable = document.querySelector("#menu .home-menu-table");
		if (!menuTable || !dishSelect) return;

		const options = [];
		menuTable.querySelectorAll("tbody tr").forEach((row) => {
			if (row.classList.contains("home-menu-category")) return;
			const cell = row.querySelector("td");
			if (cell) {
				const label = cell.textContent?.trim();
				if (label) {
					options.push(label);
				}
			}
		});

		if (!options.length) return;

		dishSelect.innerHTML = options
			.map((item) => `<option value="${item}">${item}</option>`)
			.join("");
	}

	function generateOrderId() {
		return `HCCK${Math.floor(10000 + Math.random() * 90000)}`;
	}

	function openModal(orderId) {
		if (!orderModal || !newOrderIdSpan) return;
		newOrderIdSpan.textContent = orderId;
		orderModal.style.display = "block";
		orderModal.setAttribute("aria-hidden", "false");
		document.body.style.overflow = "hidden";
	}

	function closeModal() {
		if (!orderModal) return;
		orderModal.style.display = "none";
		orderModal.setAttribute("aria-hidden", "true");
		document.body.style.overflow = "";
	}

	function simulateOrderStatusUpdates(orderId) {
		const order = orders.get(orderId);
		if (!order) return;

		const scheduleUpdate = (statusIndex, delayMs) => {
			const timeoutId = window.setTimeout(() => {
				const current = orders.get(orderId);
				if (!current) return;
				current.statusIndex = Math.max(current.statusIndex, statusIndex);
				if (trackingOrderId === orderId) {
					updateTrackingUI(orderId);
				}
			}, delayMs);

			order.timeouts.push(timeoutId);
		};

		scheduleUpdate(1, 60 * 1000);
		scheduleUpdate(2, 5 * 60 * 1000);
		scheduleUpdate(3, 10 * 60 * 1000);
	}

	function resetProgressSteps() {
		progressSteps.forEach((step) => step.classList.remove("active"));
	}

	function updateTrackingUI(orderId) {
		const order = orders.get(orderId);
		if (!order || !currentStatusText) return;

		const currentStatus = orderStatuses[order.statusIndex];
		currentStatusText.textContent = currentStatus.text;

		progressSteps.forEach((stepEl, index) => {
			if (index < currentStatus.step) {
				stepEl.classList.add("active");
			} else {
				stepEl.classList.remove("active");
			}
		});

		if (order.statusIndex >= orderStatuses.length - 1 && trackingIntervalId) {
			window.clearInterval(trackingIntervalId);
			trackingIntervalId = null;
			trackingOrderId = null;
		}
	}

	function handlePlaceOrder(event) {
		event.preventDefault();
		if (!dishSelect || !qtyInput || !addressInput || !phoneInput) return;

		const dish = dishSelect.value;
		const qty = Number.parseInt(qtyInput.value, 10) || 1;
		const address = addressInput.value.trim();
		const phone = phoneInput.value.trim();

		if (!dish || qty <= 0 || !address || !phone) {
			return;
		}

		const orderId = generateOrderId();

		orders.set(orderId, {
			statusIndex: 0,
			createdAt: Date.now(),
			timeouts: [],
		});

		simulateOrderStatusUpdates(orderId);
		openModal(orderId);

		placeOrderForm.reset();
		qtyInput.value = "1";
		if (dishSelect.options.length > 0) {
			dishSelect.selectedIndex = 0;
		}
	}

	function handleTrackOrder(event) {
		event.preventDefault();
		if (!orderIdInput) return;

		const orderId = orderIdInput.value.trim().toUpperCase();
		if (!orderId || !orders.has(orderId)) {
			if (orderStatusContainer) {
				orderStatusContainer.style.display = "none";
			}
			if (trackErrorMessage) {
				trackErrorMessage.style.display = "block";
			}
			return;
		}

		if (trackErrorMessage) {
			trackErrorMessage.style.display = "none";
		}

		if (orderStatusContainer) {
			orderStatusContainer.style.display = "block";
		}

		resetProgressSteps();
		trackingOrderId = orderId;
		updateTrackingUI(orderId);

		if (trackingIntervalId) {
			window.clearInterval(trackingIntervalId);
		}

		trackingIntervalId = window.setInterval(() => {
			updateTrackingUI(orderId);
		}, 5000);

		document.getElementById("track")?.scrollIntoView({ behavior: "smooth" });
	}

	function handleContactForm(event) {
		event.preventDefault();
		if (!contactForm) return;

		let feedback = contactForm.nextElementSibling;
		if (!feedback || !feedback.classList.contains("home-form-note")) {
			feedback = document.createElement("p");
			feedback.className = "home-form-note";
			feedback.setAttribute("aria-live", "polite");
			contactForm.insertAdjacentElement("afterend", feedback);
		}

		feedback.textContent = "Thanks for reaching out! We'll get back to you shortly.";
		feedback.classList.remove("error");
		contactForm.reset();
	}

	function initModalListeners() {
		if (!orderModal) return;

		modalCloseButton?.addEventListener("click", closeModal);

		window.addEventListener("click", (event) => {
			if (event.target === orderModal) {
				closeModal();
			}
		});

		window.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && orderModal.style.display === "block") {
				closeModal();
			}
		});
	}

	function cleanupOnUnload() {
		window.addEventListener("beforeunload", () => {
			orders.forEach((order) => {
				order.timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
			});
			if (trackingIntervalId) {
				window.clearInterval(trackingIntervalId);
			}
		});
	}

	populateDishOptions();

	if (placeOrderForm) {
		placeOrderForm.addEventListener("submit", handlePlaceOrder);
	}

	if (trackOrderForm) {
		trackOrderForm.addEventListener("submit", handleTrackOrder);
	}

	if (contactForm) {
		contactForm.addEventListener("submit", handleContactForm);
	}

	initModalListeners();
	cleanupOnUnload();
});
