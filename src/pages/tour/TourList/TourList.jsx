import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import {
  MagnifyingGlassIcon,
  ClockIcon,
  TicketIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import { useToursAPI } from "../../../hooks/useToursAPI";
import { useAuth } from "../../../contexts/AuthContext";
import TourCard from "../TourCard/TourCard";
import styles from "./TourList.module.css";

const bannerImages = [
  "https://phongma.vn/wp-content/uploads/2018/06/30-dia-diem-du-lich-da-nang-du-la-van-chua-het-hot-trong-nam-2017-phan-1-1-1024x601.jpg",
  "https://trivietagency.com/wp-content/uploads/2025/04/du-lich-da-nang.jpg",
  "https://intour.vn/upload/img/0f70a9710eb8c8bd31bb847ec81b5dd0/2022/03/14/cac_dia_diem_du_lich_noi_tieng_o_da_nang_thu_hut_khach_du_lich_quanh_nam_1647251151.png",
  "https://dulichkhamphahue.com/wp-content/uploads/2020/07/dia_diem_tham_quan_mien_phi_o_da_nang_nam_o_d.jpg",
];

const TourList = () => {
  const { tours, loading, error, fetchTours, searchToursServer } =
    useToursAPI();

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [filteredTours, setFilteredTours] = useState([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1); // Pagination cho client-side (1-based)
  const TOURS_PER_PAGE = 12; // 4 cột x 3 hàng
  const debounceRef = useRef(null);
  const controllerRef = useRef(null);
  const sliderRef = useRef(null);

  useEffect(() => {
    fetchTours();
  }, []);

  useEffect(() => {
    if (!isSearchMode) {
      setFilteredTours(tours || []);
      setCurrentPage(1); // Reset về trang 1 khi tours thay đổi
    }
  }, [tours, isSearchMode]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const query = localSearchQuery.trim();
    if (!query) {
      if (controllerRef.current) controllerRef.current.abort();
      setIsSearchMode(false);
      setPage(0);
      setTotalPages(0);
      setFilteredTours(tours || []);
      setCurrentPage(1); // Reset về trang 1 khi clear search
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsSearchMode(true);
      const res = await searchToursServer(query, 0, 20, controller.signal);
      setFilteredTours(res.items || []);
      setPage(res.pageNumber || 0);
      setTotalPages(res.totalPages || 0);
      setCurrentPage(1); // Reset về trang 1 khi search mới
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [localSearchQuery, tours]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = localSearchQuery.trim();
      if (!query) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsSearchMode(true);
      const res = await searchToursServer(query, 0, 20, controller.signal);
      setFilteredTours(res.items || []);
      setPage(res.pageNumber || 0);
      setTotalPages(res.totalPages || 0);
      setCurrentPage(1); // Reset về trang 1 khi Enter search
    }
  };

  const handleLoadMore = async () => {
    if (!isSearchMode) return;
    if (page + 1 >= totalPages) return;
    const nextPage = page + 1;
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const res = await searchToursServer(
      localSearchQuery.trim(),
      nextPage,
      20,
      controller.signal
    );
    setFilteredTours((prev) => [...prev, ...(res.items || [])]);
    setPage(res.pageNumber || nextPage);
    setTotalPages(res.totalPages || totalPages);
  };

  const handleHistoryBooking = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/user/booking-history");
  };

  // React Slick settings
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: true,
    fade: true,
    cssEase: 'linear',
    arrows: false
  };

  // Tính toán pagination cho client-side (khi không ở search mode)
  const getPaginatedTours = () => {
    if (isSearchMode) {
      // Trong search mode, sử dụng filteredTours từ server
      return filteredTours;
    }
    // Client-side pagination
    const startIndex = (currentPage - 1) * TOURS_PER_PAGE;
    const endIndex = startIndex + TOURS_PER_PAGE;
    return filteredTours.slice(startIndex, endIndex);
  };

  const getClientTotalPages = () => {
    if (isSearchMode) {
      return 0; // Server-side pagination, không dùng client pagination
    }
    return Math.ceil(filteredTours.length / TOURS_PER_PAGE);
  };

  const clientTotalPages = getClientTotalPages();
  const displayTours = getPaginatedTours();
  const shouldShowPagination =
    !isSearchMode && filteredTours.length > TOURS_PER_PAGE;

  return (
    <div className={styles["tour-list-container"]}>
      {/* Banner Carousel with React Slick */}
      <div className={styles["banner-carousel"]}>
        <Slider ref={sliderRef} {...sliderSettings} className={styles["banner-slider"]}>
          {bannerImages.map((img, index) => (
            <div key={index} className={styles["carousel-slide"]}>
              <div className={styles["slide-image"]}>
                <img src={img} alt={`Banner ${index + 1}`} />
              </div>
              <div className={styles["banner-overlay"]}>
                <div className={styles["banner-content"]}>
                  <h1 className={styles["banner-title"]}>
                    {t("tourList.hero.title")}
                  </h1>
                  <p className={styles["banner-description"]}>
                    {t("tourList.hero.desc")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      {/* Search Section */}
      <div className={styles["search-section"]}>
        <div className={styles["container"]}>
          <div className={styles["search-wrapper"]}>
            <div className={styles["search-bar"]}>
              <div className={styles["search-input-wrapper"]}>
                <MagnifyingGlassIcon className={styles["search-icon"]} />
                <input
                  type="text"
                  placeholder={t("tourList.search.placeholder")}
                  value={localSearchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  className={styles["search-input"]}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles["action-buttons"]}>
              {/* History Booking Button - Ẩn nếu user có role COMPANY */}
              {user && user.role !== "COMPANY" && (
                <button
                  className={styles["action-btn"]}
                  onClick={handleHistoryBooking}
                  title={t("tourList.historyBooking.title")}
                >
                  <ClockIcon className={styles["action-icon"]} />
                  <span className={styles["action-text"]}>
                    {t("tourList.historyBooking.title")}
                  </span>
                </button>
              )}

              {/* List All Voucher Button */}
              <button
                className={styles["action-btn"]}
                onClick={() => navigate("/tour/voucher-list")}
                title={t("tourList.voucherList.title")}
              >
                <TicketIcon className={styles["action-icon"]} />
                <span className={styles["action-text"]}>
                  {t("tourList.voucherList.title")}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tours Grid */}
      <div className={styles["tours-section"]}>
        <div className={styles["container"]}>
          {loading ? (
            <div className={styles["loading-container"]}>
              <div className={styles["loading-spinner"]}></div>
              <p>{t("tourList.loading")}</p>
            </div>
          ) : error ? (
            <div className={styles["error-container"]}>
              <div className={styles["error-message"]}>
                <h3>{t("tourList.error.title")}</h3>
                <p>{error}</p>
                <button onClick={() => fetchTours()} className={styles["retry-btn"]}>
                  {t("tourList.error.retry")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {displayTours.length > 0 ? (
                <div className={styles["tours-grid"]}>
                  {displayTours.map((tour) => (
                    <TourCard key={tour.id} tour={tour} />
                  ))}
                </div>
              ) : (
                <div className={styles["no-tours"]}>
                  <div className={styles["no-tours-content"]}>
                    <DocumentTextIcon className={styles["no-tours-icon"]} />
                    <h3>{t("tourList.empty.title")}</h3>
                    <p>{t("tourList.empty.desc")}</p>
                  </div>
                </div>
              )}

              {/* Pagination - chỉ hiển thị khi có nhiều hơn 12 tours và có tours */}
              {shouldShowPagination && displayTours.length > 0 && (
                <div className={styles["pagination-container"]}>
                  <div className={styles["pagination"]}>
                    <button
                      className={styles["pagination-btn"]}
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      aria-label="First page"
                      title="Trang đầu"
                    >
                      <ChevronDoubleLeftIcon className={styles["pagination-icon"]} />
                    </button>
                    <button
                      className={styles["pagination-btn"]}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                      title="Trang trước"
                    >
                      <ChevronLeftIcon className={styles["pagination-icon"]} />
                    </button>

                    {/* Page numbers */}
                    {Array.from(
                      { length: Math.min(5, clientTotalPages) },
                      (_, i) => {
                        let pageNum;
                        if (clientTotalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= clientTotalPages - 2) {
                          pageNum = clientTotalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            className={`${styles["pagination-page"]} ${
                              currentPage === pageNum ? styles["active"] : ""
                            }`}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                    )}

                    {clientTotalPages > 5 &&
                      currentPage < clientTotalPages - 2 && (
                        <span className={styles["pagination-ellipsis"]}>
                          ...
                        </span>
                      )}

                    {clientTotalPages > 5 &&
                      currentPage < clientTotalPages - 2 && (
                        <button
                          className={`${styles["pagination-page"]} ${
                            currentPage === clientTotalPages
                              ? styles["active"]
                              : ""
                          }`}
                          onClick={() => setCurrentPage(clientTotalPages)}
                        >
                          {clientTotalPages}
                        </button>
                      )}

                    <button
                      className={styles["pagination-btn"]}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === clientTotalPages}
                      aria-label="Next page"
                      title="Trang sau"
                    >
                      <ChevronRightIcon className={styles["pagination-icon"]} />
                    </button>
                    <button
                      className={styles["pagination-btn"]}
                      onClick={() => setCurrentPage(clientTotalPages)}
                      disabled={currentPage === clientTotalPages}
                      aria-label="Last page"
                      title="Trang cuối"
                    >
                      <ChevronDoubleRightIcon className={styles["pagination-icon"]} />
                    </button>
                  </div>
                  <div className={styles["pagination-info"]}>
                    {t("tourList.pagination.showing", {
                      start: (currentPage - 1) * TOURS_PER_PAGE + 1,
                      end: Math.min(
                        currentPage * TOURS_PER_PAGE,
                        filteredTours.length
                      ),
                      total: filteredTours.length,
                    })}
                  </div>
                </div>
              )}

              {filteredTours.length > 0 && isSearchMode && (
                <div className={styles["load-more-section"]}>
                  <button
                    className={styles["load-more-btn"]}
                    onClick={handleLoadMore}
                    disabled={loading || page + 1 >= totalPages}
                  >
                    {t("tourList.loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TourList;
