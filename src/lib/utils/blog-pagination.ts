/**
 * ブログページネーション機能のクラス
 */
export class BlogPagination {
  itemsPerPage: number;
  currentPage: number;
  currentCategory: string;
  allBlogs: Element[];
  filteredBlogs: Element[];
  totalPages: number;
  isMobile: boolean;

  constructor() {
    this.itemsPerPage = 6;
    this.currentPage = 1;
    this.currentCategory = "all";
    this.allBlogs = [];
    this.filteredBlogs = [];
    this.totalPages = 1;
    this.isMobile = window.innerWidth <= 767;

    this.init();
  }

  init(): void {
    // Get all blog cards
    this.allBlogs = Array.from(document.querySelectorAll(".blog-card"));
    this.filteredBlogs = [...this.allBlogs];

    // Calculate total pages
    this.totalPages = Math.ceil(this.filteredBlogs.length / this.itemsPerPage);

    // Initialize pagination
    this.updatePaginationUI();

    // Show all blogs on mobile, paginated on desktop
    if (this.isMobile) {
      this.showAllBlogs();
    } else {
      this.showPage(1);
    }

    // Add event listeners
    this.addEventListeners();
  }

  addEventListeners(): void {
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (prevBtn) prevBtn.addEventListener("click", () => this.previousPage());
    if (nextBtn) nextBtn.addEventListener("click", () => this.nextPage());
  }

  filterByCategory(categoryId: string): void {
    this.currentCategory = categoryId;
    this.currentPage = 1;

    // Filter blogs by category
    this.filteredBlogs = this.allBlogs.filter((blog) => {
      const blogCategory = blog.getAttribute("data-category");
      return categoryId === "all" || blogCategory === categoryId;
    });

    // Recalculate total pages
    this.totalPages = Math.ceil(this.filteredBlogs.length / this.itemsPerPage);

    // Update UI without animation
    this.updatePaginationUI();

    // Show all blogs on mobile, paginated on desktop
    if (this.isMobile) {
      this.showAllBlogs();
    } else {
      this.showPage(1);
    }
  }

  showPage(page: number): void {
    this.currentPage = page;

    // Hide all blogs first
    this.allBlogs.forEach((blog) => {
      (blog as HTMLElement).style.display = "none";
    });

    // Show blogs for current page
    const startIndex = (page - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;

    this.filteredBlogs.slice(startIndex, endIndex).forEach((blog) => {
      (blog as HTMLElement).style.display = "block";
    });

    // Update pagination UI
    this.updatePaginationUI();

    // Show no blogs message if needed
    if (this.filteredBlogs.length === 0) {
      this.showNoBlogsMessage();
    } else {
      this.hideNoBlogsMessage();
    }
  }

  showAllBlogs(): void {
    // Hide all blogs first
    this.allBlogs.forEach((blog) => {
      (blog as HTMLElement).style.display = "none";
    });

    // Show all filtered blogs
    this.filteredBlogs.forEach((blog) => {
      (blog as HTMLElement).style.display = "block";
    });

    // Show no blogs message if needed
    if (this.filteredBlogs.length === 0) {
      this.showNoBlogsMessage();
    } else {
      this.hideNoBlogsMessage();
    }
  }

  hideAllBlogs(): void {
    this.allBlogs.forEach((blog) => {
      const blogElement = blog as HTMLElement;
      blogElement.style.display = "none";

      // Clear all animation classes
      blogElement.classList.remove(
        "animating",
        "animating-in",
        "animating-out",
        "hidden",
        "fade-out",
        "fade-in",
        "domino-in",
      );
    });
  }

  updatePaginationUI(): void {
    const currentPageEl = document.getElementById("current-page");
    const totalPagesEl = document.getElementById("total-pages");
    const totalItemsEl = document.getElementById("total-items");
    const prevBtn = document.getElementById("prev-page") as HTMLButtonElement;
    const nextBtn = document.getElementById("next-page") as HTMLButtonElement;

    if (currentPageEl) currentPageEl.textContent = this.currentPage.toString();
    if (totalPagesEl) totalPagesEl.textContent = this.totalPages.toString();
    if (totalItemsEl)
      totalItemsEl.textContent = this.filteredBlogs.length.toString();

    // Update button states
    if (prevBtn) prevBtn.disabled = this.currentPage === 1;
    if (nextBtn) nextBtn.disabled = this.currentPage === this.totalPages;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.showPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.showPage(this.currentPage + 1);
    }
  }

  showNoBlogsMessage(): void {
    const blogGrid = document.querySelector(".blog-grid");
    if (!blogGrid) return;

    this.hideNoBlogsMessage();

    const messageDiv = document.createElement("div");
    messageDiv.className = "no-blogs-message";
    messageDiv.innerHTML = `
      <div class="no-blogs-content">
        <h3>表示するブログがありません</h3>
        <p>「${this.currentCategory === "all" ? "All" : this.currentCategory}」カテゴリーにはまだブログが投稿されていません。</p>
      </div>
    `;

    blogGrid.appendChild(messageDiv);
  }

  hideNoBlogsMessage(): void {
    const blogGrid = document.querySelector(".blog-grid");
    if (!blogGrid) return;

    const existingMessage = blogGrid.querySelector(".no-blogs-message");
    if (existingMessage) {
      existingMessage.remove();
    }
  }
}

/**
 * ページネーションを初期化する関数
 */
export function initializeBlogPagination(): void {
  document.addEventListener("DOMContentLoaded", () => {
    (window as any).blogPagination = new BlogPagination();

    // Handle window resize
    window.addEventListener("resize", () => {
      if ((window as any).blogPagination) {
        const pagination = (window as any).blogPagination as BlogPagination;
        const wasMobile = pagination.isMobile;
        pagination.isMobile = window.innerWidth <= 767;

        // If mobile state changed, reinitialize display
        if (wasMobile !== pagination.isMobile) {
          if (pagination.isMobile) {
            pagination.showAllBlogs();
          } else {
            pagination.showPage(1);
          }
        }
      }
    });
  });
}
