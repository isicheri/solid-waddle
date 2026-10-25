const initialMsg = document.querySelector("#mobile-only-message");
const hamburger = document.querySelector(".hamburger-con")


// Accordions Interactive Toggle (works for both Mobile Menu and Footer)
document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
        const item = header.closest(".accordion-item");
        const container = header.closest(".footer-accordions") || document;
        const isOpen = item.classList.contains("active");

        // Close other items in the same container
        container.querySelectorAll(".accordion-item").forEach((el) => {
            if (el !== item) el.classList.remove("active");
        });

        // Toggle clicked item
        item.classList.toggle("active", !isOpen);
    });
});

// Mobile Menu Toggle & Hamburger Animation
hamburger.addEventListener("click", () => {
    document.querySelector(".mobile-menu-con").classList.toggle("is-mobile-menu-active");
    hamburger.classList.toggle("is-active");
});

