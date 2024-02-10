document.addEventListener("DOMContentLoaded", function () {
  const gridItems = document.querySelectorAll(".grid-item");
  const overlay = document.getElementById("overlay");
  const modal = document.getElementById("modal");
  const expandedImage = document.getElementById("expanded-image");
  const closeModal = document.getElementById("close-modal");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  let currentIndex = 0;

  gridItems.forEach((item, index) => {
    item.addEventListener("click", function () {
      currentIndex = index;
      const clickedImageSrc = this.querySelector("img").src;
      expandedImage.src = clickedImageSrc;
      overlay.style.display = "block";
    });
  });

  closeModal.addEventListener("click", function () {
    closeExpandedImage();
  });

  overlay.addEventListener("click", function () {
    closeExpandedImage();
  });

  modal.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  prevBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    showPrevImage();
  });

  nextBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    showNextImage();
  });

  function showPrevImage() {
    currentIndex = (currentIndex - 1 + gridItems.length) % gridItems.length;
    const prevImageSrc = gridItems[currentIndex].querySelector("img").src;
    expandedImage.src = prevImageSrc;
  }

  function showNextImage() {
    currentIndex = (currentIndex + 1) % gridItems.length;
    const nextImageSrc = gridItems[currentIndex].querySelector("img").src;
    expandedImage.src = nextImageSrc;
  }

  function closeExpandedImage() {
    overlay.style.display = "none";
  }
});
