/**
 * ブログ一覧のページ送り。
 * モバイルでは全件そのまま流し、デスクトップでのみページに区切る。
 */
const ITEMS_PER_PAGE = 6;
const MOBILE_QUERY = "(width <= 47.9375rem)";

export class BlogPagination {
  private readonly cells: HTMLElement[];
  private readonly prevBtn: HTMLButtonElement | null;
  private readonly nextBtn: HTMLButtonElement | null;
  private readonly currentEl: HTMLElement | null;
  private readonly totalEl: HTMLElement | null;
  private readonly mql: MediaQueryList;
  private currentPage = 1;

  constructor() {
    this.cells = Array.from(
      document.querySelectorAll<HTMLElement>(".blog-card-cell"),
    );
    this.prevBtn = document.querySelector<HTMLButtonElement>("#prev-page");
    this.nextBtn = document.querySelector<HTMLButtonElement>("#next-page");
    this.currentEl = document.querySelector<HTMLElement>("#current-page");
    this.totalEl = document.querySelector<HTMLElement>("#total-pages");

    this.prevBtn?.addEventListener("click", () =>
      this.go(this.currentPage - 1),
    );
    this.nextBtn?.addEventListener("click", () =>
      this.go(this.currentPage + 1),
    );

    this.mql = window.matchMedia(MOBILE_QUERY);
    this.mql.addEventListener("change", () => this.render());

    this.render();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.cells.length / ITEMS_PER_PAGE));
  }

  private go(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  private render(): void {
    const showAll = this.mql.matches;
    const start = (this.currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    this.cells.forEach((cell, index) => {
      const visible = showAll || (index >= start && index < end);
      cell.hidden = !visible;
    });

    if (this.currentEl) {
      this.currentEl.textContent = String(this.currentPage);
    }
    if (this.totalEl) {
      this.totalEl.textContent = String(this.totalPages);
    }
    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentPage === 1;
    }
    if (this.nextBtn) {
      this.nextBtn.disabled = this.currentPage === this.totalPages;
    }
  }
}

export function initializeBlogPagination(): void {
  new BlogPagination();
}
