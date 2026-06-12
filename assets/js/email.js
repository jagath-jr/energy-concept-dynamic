document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================================
    // 1. HANDLE STANDARD CONTACT FORMS (Home & Contact Page)
    // ============================================================
    const contactForms = ['pm-contact-form', 'contact-form']; 

    contactForms.forEach(formId => {
        const form = document.getElementById(formId);
        
        // If form doesn't exist on this page, skip it
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Stop page reload

            // UI Feedback
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            // Gather Data (Convert to JSON)
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.pageSource = document.title; 

            try {
                const response = await fetch('/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    alert('Thank you! Your message has been sent successfully.');
                    form.reset();
                } else {
                    alert('Failed to send message: ' + (result.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please check your connection.');
            } finally {
                // Reset Button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    });

    // ============================================================
    // 2. HANDLE JOB APPLICATION FORM (Careers Page - File Upload)
    // ============================================================
    const careerForm = document.getElementById('career-form');

    if (careerForm) {
        careerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Stop page reload

            // UI Feedback
            const submitBtn = careerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Uploading...'; // Different text for large files
            submitBtn.disabled = true;

            // Gather Data (Keep as FormData for File Upload)
            // IMPORTANT: Do NOT convert to JSON, or the file won't send.
            const formData = new FormData(careerForm);

            try {
                // Send to the special application route
                const response = await fetch('/send-application', {
                    method: 'POST',
                    // Note: Do NOT set 'Content-Type' header manually here. 
                    // The browser sets it automatically to 'multipart/form-data' with the boundary.
                    body: formData 
                });

                const result = await response.json();

                if (result.success) {
                    alert('Success! Your application and resume have been sent.');
                    careerForm.reset();
                } else {
                    alert('Application failed: ' + (result.message || 'Please upload a valid PDF/Word doc'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while uploading. Please check your connection or file size.');
            } finally {
                // Reset Button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});