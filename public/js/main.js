/**
 * Main JavaScript file for Certificate Management System
 * Enhanced with modern UI interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Add smooth scrolling for all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add animation to cards on scroll
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.card, .feature-card, .stat-card');

        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;

            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('visible');
            }
        });
    };

    // Add CSS class for animation
    const style = document.createElement('style');
    style.textContent = `
        .card, .feature-card, .stat-card {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .card.visible, .feature-card.visible, .stat-card.visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);

    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Initial check

    // File input preview
    const fileInput = document.getElementById('file');
    const previewContainer = document.getElementById('preview-container');

    if (fileInput && previewContainer) {
        fileInput.addEventListener('change', function() {
            previewContainer.innerHTML = '';

            if (this.files && this.files[0]) {
                const file = this.files[0];

                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();

                    reader.onload = function(e) {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.className = 'img-thumbnail mt-2';
                        img.style.maxHeight = '200px';
                        previewContainer.appendChild(img);
                    };

                    reader.readAsDataURL(file);
                } else {
                    const fileInfo = document.createElement('div');
                    fileInfo.className = 'alert alert-info mt-2';
                    fileInfo.textContent = `File selected: ${file.name} (${formatFileSize(file.size)})`;
                    previewContainer.appendChild(fileInfo);
                }
            }
        });
    }

    // Certificate search form
    const searchForm = document.getElementById('certificate-search-form');
    const resultsContainer = document.getElementById('search-results');

    if (searchForm && resultsContainer) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const searchParams = new URLSearchParams();

            for (const [key, value] of formData.entries()) {
                if (value) {
                    searchParams.append(key, value);
                }
            }

            // Show loading spinner
            resultsContainer.innerHTML = `
                <div class="spinner-container">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;

            // Fetch search results
            fetch(`/certificates/search?${searchParams.toString()}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                displaySearchResults(data);
            })
            .catch(error => {
                console.error('Search error:', error);
                resultsContainer.innerHTML = `
                    <div class="alert alert-danger">
                        An error occurred while searching. Please try again.
                    </div>
                `;
            });
        });
    }

    // Attendance recording form
    const attendanceForm = document.getElementById('attendance-form');

    if (attendanceForm) {
        attendanceForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);

            fetch('/admin/attendance', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showAlert('Attendance recorded successfully', 'success');
                    this.reset();
                } else {
                    showAlert('Error recording attendance', 'danger');
                }
            })
            .catch(error => {
                console.error('Attendance error:', error);
                showAlert('An error occurred. Please try again.', 'danger');
            });
        });
    }

    // Initialize charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    }

    // Handle logout links
    const logoutLinks = document.querySelectorAll('a[href="/logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Show confirmation dialog
            if (confirm('Are you sure you want to logout?')) {
                // Redirect to logout URL
                window.location.href = '/logout';
            }
        });
    });
});

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Display search results
 * @param {Array} data - Search results
 */
function displaySearchResults(data) {
    const resultsContainer = document.getElementById('search-results');

    if (!resultsContainer) return;

    if (!data || data.length === 0) {
        resultsContainer.innerHTML = `
            <div class="alert alert-info">
                No certificates found matching your search criteria.
            </div>
        `;
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Course Type</th>
                        <th>Course Name</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach(cert => {
        html += `
            <tr>
                <td>${cert.Stu_id}</td>
                <td>${cert.student_name}</td>
                <td>${cert.course_type}</td>
                <td>${cert.course_name}</td>
                <td>${new Date(cert.dateoncertificate).toLocaleDateString()}</td>
                <td>
                    <a href="/download/${cert.file_id}" class="btn btn-sm btn-primary">
                        <i class="bi bi-download"></i> Download
                    </a>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    resultsContainer.innerHTML = html;
}

/**
 * Show alert message
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success, danger, warning, info)
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');

    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    alertContainer.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alertContainer.removeChild(alert);
        }, 150);
    }, 5000);
}

/**
 * Initialize charts
 */
function initializeCharts() {
    // Attendance chart
    const attendanceChartEl = document.getElementById('attendance-chart');

    if (attendanceChartEl) {
        const attendanceData = JSON.parse(attendanceChartEl.dataset.attendance || '{}');

        if (attendanceData.labels && attendanceData.presentData && attendanceData.absentData) {
            new Chart(attendanceChartEl, {
                type: 'bar',
                data: {
                    labels: attendanceData.labels,
                    datasets: [
                        {
                            label: 'Present',
                            data: attendanceData.presentData,
                            backgroundColor: 'rgba(25, 135, 84, 0.7)',
                            borderColor: 'rgba(25, 135, 84, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Absent',
                            data: attendanceData.absentData,
                            backgroundColor: 'rgba(220, 53, 69, 0.7)',
                            borderColor: 'rgba(220, 53, 69, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Days'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Monthly Attendance'
                        },
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        }
    }

    // Certificate types chart
    const certTypesChartEl = document.getElementById('cert-types-chart');

    if (certTypesChartEl) {
        const certTypesData = JSON.parse(certTypesChartEl.dataset.types || '{}');

        if (Object.keys(certTypesData).length > 0) {
            const labels = Object.keys(certTypesData);
            const data = Object.values(certTypesData);

            new Chart(certTypesChartEl, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            data: data,
                            backgroundColor: [
                                'rgba(13, 110, 253, 0.7)',
                                'rgba(25, 135, 84, 0.7)',
                                'rgba(255, 193, 7, 0.7)',
                                'rgba(13, 202, 240, 0.7)',
                                'rgba(111, 66, 193, 0.7)',
                                'rgba(220, 53, 69, 0.7)'
                            ],
                            borderColor: [
                                'rgba(13, 110, 253, 1)',
                                'rgba(25, 135, 84, 1)',
                                'rgba(255, 193, 7, 1)',
                                'rgba(13, 202, 240, 1)',
                                'rgba(111, 66, 193, 1)',
                                'rgba(220, 53, 69, 1)'
                            ],
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Certificate Types Distribution'
                        },
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
    }
}
