const localGalleryImages = [
  { url: "assets/images/gallery-img/gallery-img1.webp", caption: "" },
    { url: "assets/images/gallery-img/gallery-img2.webp", caption: "" },
    { url: "assets/images/gallery-img/gallery-img3.webp", caption: "" },
    { url: "assets/images/gallery-img/gallery-img4.webp", caption: "" },
    { url: "assets/images/gallery-img/gallery-img5.webp", caption: "" },
    { url: "assets/images/gallery-img/gallery-img6.webp", caption: "" }
  // Add more fallback images
];

async function initializeGallery() {
  try {
    await getBearerToken();
    const apiImages = await getGalleryImagesFromAPI();
    
    if (apiImages && apiImages.length > 0) {
      displayGalleryImages(apiImages.map(img => ({
        url: 'https://corteza.duvitra.com/' + img.url,
        caption: img.caption || ""
      })));
    } else {
      displayGalleryImages(localGalleryImages);
    }
  } catch (error) {
    console.error("Using local gallery due to error:", error);
    displayGalleryImages(localGalleryImages);
  }
}

// Modified display function to accept images parameter
function displayGalleryImages(images) {
  const galleryDiv = document.querySelector("#galleryDiv");
  let innerHTML = "";
  
  images.forEach((img, i) => {
    innerHTML += `
      <div class="gallery-item" data-aos="fade-up">
        <label for="img-modal-${i}">
          <img src="${img.url}" alt="Gallery Image" />
          <div class="caption">${img.caption}</div>
        </label>
      </div>
      <input type="checkbox" id="img-modal-${i}" class="modal-toggle" />
      <div class="modal-box">
        <label for="img-modal-${i}" class="overlay"></label>
        <div class="modal-content-box">
          <label for="img-modal-${i}" class="close-btn">&times;</label>
          <img src="${img.url}" alt="Popup Image" />
          <p class="modal-caption">${img.caption}</p>
        </div>
      </div>
    `;
  });
  
  galleryDiv.innerHTML = innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeGallery);