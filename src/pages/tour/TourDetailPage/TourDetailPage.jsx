import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useToursAPI } from "../../../hooks/useToursAPI";
import styles from "./TourDetailPage.module.css";
import { ShareTourModal, LoginRequiredModal, VoucherDetailModal, VoucherListModal } from "../../../components";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";
import { useTourRated } from "../../../hooks/useTourRated";
import useWeatherFromTour from "../../../hooks/useWeatherFromTour";
import DeleteConfirmModal from "../../../components/modals/DeleteConfirmModal/DeleteConfirmModal";
import { API_ENDPOINTS, createAuthHeaders } from "../../../config/api";
import { checkAndHandle401 } from "../../../utils/apiErrorHandler";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Star,
  Share2,
  Eye,
  Search,
  MoreVertical,
  Trash2,
  Banknote,
  Calendar,
  Percent,
} from "lucide-react";

// Adjust color brightness by percentage (negative to darken)
const shadeColor = (hex, percent) => {
  try {
    let color = hex.trim();
    if (!color.startsWith("#")) return color;
    if (color.length === 4) {
      color =
        "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    const num = parseInt(color.slice(1), 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.min(255, Math.max(0, Math.round(r + (percent / 100) * 255)));
    g = Math.min(255, Math.max(0, Math.round(g + (percent / 100) * 255)));
    b = Math.min(255, Math.max(0, Math.round(b + (percent / 100) * 255)));
    const toHex = (v) => v.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return hex;
  }
};

// Helper build params for weather hook without changing page logic
const _BUILD_WEATHER_PARAMS = (tourData) => {
  if (!tourData) return { tourName: "", tourSchedule: "" };
  const tourName = tourData.tour_name || tourData.title || "";
  const tourSchedule = tourData.tour_schedule || tourData.tourSchedule || "";
  return { tourName, tourSchedule };
};

const TourDetailPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const { fetchTourById, loading, error } = useToursAPI();
  const { t } = useTranslation();
  const [tour, setTour] = useState(null);
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const location = useLocation();
  const [openShare, setOpenShare] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);
  const [isVoucherListModalOpen, setIsVoucherListModalOpen] = useState(false);
  const {
    ratings,
    submitRating,
    deleteRating,
    canRate,
    refresh,
  } = useTourRated(id || null);
  const [newStar, setNewStar] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [voucherSuggestions, setVoucherSuggestions] = useState([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [voucherEmptyReason, setVoucherEmptyReason] = useState("");
  // close open menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const onDocClick = (e) => {
      const target = e.target;
      if (!target) return;
      const container = target.closest?.(`[data-menu-id="${openMenuId}"]`);
      if (!container) setOpenMenuId(null);
    };
    document.addEventListener("click", onDocClick, { capture: true });
    return () =>
      document.removeEventListener("click", onDocClick, { capture: true });
  }, [openMenuId]);

  // Build itinerary data from API (contents or tourSchedule from Step 2)
  const getItineraryFromTour = (tourData) => {
    if (!tourData) return [];
    if (Array.isArray(tourData.contents) && tourData.contents.length > 0) {
      return tourData.contents.map((item, index) => {
        // Check if description is default text and treat as empty
        const defaultTexts = [
          `Hoạt động ngày ${index + 1}`,
          `Activity Day ${index + 1}`,
          `Day ${index + 1} Activity`,
          "Hoạt động ngày 1",
          "Activity Day 1",
          "Day 1 Activity",
        ];
        const isDefaultText = defaultTexts.some(
          (defaultText) => item.tourContentDescription === defaultText
        );

        return {
          dayTitle: item.tourContentTitle || `Ngày ${index + 1}`,
          description:
            isDefaultText || !item.tourContentDescription
              ? ""
              : item.tourContentDescription,
          images: item.images || [],
          // Optional presentation data if present from wizard
          dayColor: item.dayColor || item.color,
          titleAlignment: item.titleAlignment || "left",
        };
      });
    }
    try {
      const parsed = JSON.parse(tourData.tourSchedule || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (!id) {
      navigate("/tour");
      return;
    }

    let isMounted = true;
    const tourId = parseInt(id);
    
    if (isNaN(tourId)) {
      navigate("/tour");
      return;
    }

    const loadTour = async () => {
      try {
        const tourData = await fetchTourById(tourId);
        if (isMounted) {
          setTour(tourData);
        }
      } catch (error) {
        console.error("Error loading tour:", error);
        if (isMounted) {
          navigate("/tour");
        }
      }
    };

    loadTour();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]); // fetchTourById is stable from hook

  useEffect(() => {
    let isSubscribed = true;

    const loadVoucherSuggestions = async () => {
      if (!tour?.id) return;

      setVoucherLoading(true);
      setVoucherError("");
      setVoucherEmptyReason("");

      try {
        const tourId = Number(tour.id);
        if (Number.isNaN(tourId)) {
          return;
        }

        // Lấy token giống logic getToken trong AuthContext nhưng không gọi hook
        const sessionToken =
          sessionStorage.getItem("token_ADMIN") ||
          sessionStorage.getItem("token_STAFF") ||
          sessionStorage.getItem("token");
        const localToken =
          localStorage.getItem("token_ADMIN") ||
          localStorage.getItem("token_STAFF") ||
          localStorage.getItem("token");
        const token = sessionToken || localToken || null;
        const headers = createAuthHeaders(token || undefined);

        const response = await fetch(
          API_ENDPOINTS.VOUCHERS_BY_TOUR(tourId),
          {
            method: "GET",
            headers,
          }
        );

        // Handle 401 explicitly so không bị auto logout bất ngờ ở chỗ khác
        if (response.status === 401) {
          await checkAndHandle401(response);
          if (!isSubscribed) return;
          setVoucherSuggestions([]);
          setVoucherEmptyReason("");
          setVoucherError(
            t("tourPage.detail.vouchers.sessionExpired") ||
              "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          );
          return;
        }

        if (!response.ok) {
          let errorData = {};
          const contentType = response.headers.get("content-type");
          try {
            if (contentType && contentType.includes("application/json")) {
              errorData = await response.json();
            } else {
              const text = await response.text();
              errorData = { message: text };
            }
          } catch {
            // ignore parse error
          }

          if (!isSubscribed) return;
          setVoucherSuggestions([]);
          setVoucherEmptyReason("");
          setVoucherError(
            errorData.message ||
              errorData.error ||
              t("tourPage.detail.vouchers.errorGeneric")
          );
          return;
        }

        const data = await response.json().catch(() => []);
        let vouchers = Array.isArray(data)
          ? data
          : Array.isArray(data?.vouchers)
          ? data.vouchers
          : [];

        // Lọc bỏ voucher đã hết hạn dựa trên endDate
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        vouchers = vouchers.filter((voucher) => {
          const rawEndDate =
            voucher?.endDate || voucher?.meta?.endDate || voucher?.expiryDate;
          if (!rawEndDate) return true; // nếu BE không gửi endDate thì coi như luôn hiển thị
          const end = new Date(rawEndDate);
          if (Number.isNaN(end.getTime())) return true;
          end.setHours(23, 59, 59, 999); // còn hiệu lực đến hết ngày endDate
          return end >= today;
            });

        if (!isSubscribed) return;
        setVoucherSuggestions(vouchers);
        if (!vouchers.length) {
              setVoucherEmptyReason(t("tourPage.detail.vouchers.empty"));
        }
      } catch (error) {
        if (!isSubscribed) return;
        setVoucherSuggestions([]);
        setVoucherEmptyReason("");
        setVoucherError(
          error?.message || t("tourPage.detail.vouchers.errorGeneric")
        );
      } finally {
        if (isSubscribed) {
          setVoucherLoading(false);
        }
      }
    };

    if (tour?.id) {
      loadVoucherSuggestions();
    }

    return () => {
      isSubscribed = false;
    };
  }, [tour?.id, t]);

  // Weather hook params and data (must be before early returns)
  const { tourName, tourSchedule } = _BUILD_WEATHER_PARAMS(tour);
  const {
    data: weatherData,
    loading: weatherLoading,
    error: weatherError,
  } = useWeatherFromTour({ tourName, tourSchedule, multi: true, limit: 3 });

  const iconFromDesc = (desc = "") => {
    const s = (desc || "").toLowerCase();
    if (/(mưa|rain)/.test(s)) return "🌧️";
    if (/(giông|thunder|storm)/.test(s)) return "⛈️";
    if (/(tuyết|snow)/.test(s)) return "❄️";
    if (/(mây rải rác|few clouds)/.test(s)) return "⛅";
    if (/(mây|cloud)/.test(s)) return "☁️";
    if (/(sương|mist|fog)/.test(s)) return "🌫️";
    if (/(nắng|clear|trong)/.test(s)) return "☀️";
    return "🌤️";
  };
  const formatDay = (unix) => {
    const dt = new Date((unix || 0) * 1000);
    return dt.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  };

  if (loading || !tour) {
    return (
      <div className={styles["tour-detail-loading"]}>
        <div className={styles["loading-spinner"]}></div>
        <p>{t("tourPage.detail.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles["tour-detail-error"]}>
        <h3>{t("tourPage.detail.errorTitle")}</h3>
        <p>{error}</p>
        <button
          onClick={() => navigate("/tour")}
          className={styles["back-btn"]}
        >
          {t("tourPage.detail.backToList")}
        </button>
      </div>
    );
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };


  // Format currency helper (similar to VoucherList)
  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(Number(value || 0));
    } catch {
      return `${value}`;
    }
  };

  // Format date helper (similar to VoucherList)
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // Get status badge (similar to VoucherList)
  const getStatusBadge = (voucher) => {
    const now = new Date();
    const endDate = voucher.endDate
      ? new Date(voucher.endDate)
      : voucher.meta?.endDate
      ? new Date(voucher.meta.endDate)
      : null;
    const daysLeft = endDate
      ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
      : null;

    if (daysLeft !== null && daysLeft <= 7 && daysLeft > 0) {
      return (
        <span className={styles["voucher-status-badge"]}>
          {t("tourPage.detail.vouchers.statusDays", { days: daysLeft })}
        </span>
      );
    }
    return null;
  };

  // Get days left text for date range badge
  const getDaysLeftText = (voucher) => {
    if (!voucher?.endDate) return null;
    const now = new Date();
    const endDate = new Date(voucher.endDate);
    if (Number.isNaN(endDate.getTime())) return null;
    const diff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return null;
    if (diff === 0) return t("tourPage.detail.vouchers.expiresToday");
    if (diff <= 7)
      return t("tourPage.detail.vouchers.daysLeft", { days: diff });
    return null;
  };


  const handleBookNow = () => {
    if (!user) {
      setShowLoginRequired(true);
      return;
    }
    if (user && user.role === "COMPANY") {
      // Company accounts cannot book tours - this is handled by UI state
      return;
    }
    // Clear any previous booking wizard data for this tour before starting a new booking
    localStorage.removeItem(`bookingData_${id}`);
    localStorage.removeItem(`hasConfirmedLeave_${id}`);
    sessionStorage.removeItem("pendingBooking");
    navigate(`/tour/booking?id=${id}`);
  };

  const handleBackToList = () => {
    navigate("/tour");
  };

  const handleBackToManagement = () => {
    navigate("/company/tours");
  };


  const itinerary = getItineraryFromTour(tour);
  const ratingStats = (() => {
    const total = ratings.length;
    if (total === 0) return { avg: 0, dist: [0, 0, 0, 0, 0], total };
    const dist = [0, 0, 0, 0, 0];
    let sum = 0;
    ratings.forEach((r) => {
      const s = Math.max(1, Math.min(5, Number(r.star) || 0));
      dist[s - 1]++;
      sum += s;
    });
    const avg = sum / total;
    return { avg, dist, total };
  })();
  const formatAvg = (v) => (Math.round(v * 10) / 10).toFixed(1);

  const isCompany = !!user && user.role === "COMPANY";
  const fromManagement = !!(
    location &&
    location.state &&
    location.state.fromManagement
  );

  return (
    <div className={styles["tour-detail-page"]}>
      {/* Hero Section */}
      <div className={styles["tour-hero-section"]}>
        <div className={styles["hero-background"]}>
          <img
            src={tour.image || "/default-Tour.jpg"}
            alt={tour.title}
            onError={(e) => {
              e.target.src = "/default-Tour.jpg";
            }}
          />
          <div className={styles["hero-overlay"]}></div>
        </div>

        <div className={styles["hero-content"]}>
          <div className={styles["container"]}>
            {isCompany && fromManagement ? (
              <button
                onClick={handleBackToManagement}
                className={styles["back-button"]}
              >
                <ArrowLeft className={styles["back-icon"]} />
                <span>{t("tourPage.detail.backToManagement")}</span>
              </button>
            ) : (
              <button
                onClick={handleBackToList}
                className={styles["back-button"]}
              >
                <ArrowLeft className={styles["back-icon"]} />
                <span>{t("tourPage.detail.back")}</span>
              </button>
            )}

            <div className={styles["hero-info"]}>
              <div className={styles["hero-badge"]}>
                <span>{t("tourPage.detail.badge")}</span>
              </div>
              <h1 className={styles["hero-title"]}>{tour.title}</h1>
              <div className={styles["hero-meta"]}>
                <div className={styles["meta-item"]}>
                  <Clock className={styles["meta-icon"]} />
                  <span>{tour.duration}</span>
                </div>
                <div className={styles["meta-item"]}>
                  <Star className={styles["meta-icon"]} />
                  <span>
                    {ratingStats.total > 0 
                      ? `${formatAvg(ratingStats.avg)}/5 (${ratingStats.total} đánh giá)`
                      : "Chưa có đánh giá"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {/* Weather Section under hero */}
      <div className={styles["tour-detail-content"]}>
        <div
          className={`${styles["container"]} ${styles["container-wide"]} ${styles["container-narrow"]}`}
        >
          <div style={{ margin: "16px 0 8px" }}>
            <h2 className={styles["weather-title"]}>
              {t("tourPage.detail.weather.title")}
            </h2>
            {weatherLoading && (
              <div className={styles["weather-loading"]}>
                {t("tourPage.detail.weather.loading")}
              </div>
            )}
            {!weatherLoading && weatherError && (
              <div className={styles["weather-error"]}>{weatherError}</div>
            )}
            {!weatherLoading && !weatherError && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {weatherData.length === 0 ? (
                  <div className={styles["weather-empty"]}>
                    {t("tourPage.detail.weather.empty")}
                  </div>
                ) : (
                  weatherData.map((w, i) => {
                    const WeatherCarousel = ({ days }) => {
                      const MAX_DAYS = 6;
                      const validDays = Array.isArray(days)
                        ? days.filter(Boolean).slice(0, MAX_DAYS)
                        : [];

                      if (validDays.length === 0) {
                        return null;
                      }

                      const slidesDesktop = Math.min(4, validDays.length);
                      const slidesLaptop = Math.min(3, validDays.length);
                      const slidesTablet = Math.min(2, validDays.length);

                      const sliderSettings = {
                        arrows: false,
                        dots: false,
                        infinite: validDays.length > 1,
                        slidesToShow: slidesDesktop,
                        slidesToScroll: 1,
                        autoplay: true,
                        autoplaySpeed: 4000,
                        speed: 600,
                        pauseOnHover: true,
                        swipeToSlide: true,
                        cssEase: "ease-in-out",
                        responsive: [
                          {
                            breakpoint: 1536,
                            settings: {
                              slidesToShow: slidesLaptop,
                            },
                          },
                          {
                            breakpoint: 1024,
                            settings: {
                              slidesToShow: slidesTablet,
                            },
                          },
                          {
                            breakpoint: 640,
                            settings: {
                              slidesToShow: 1,
                            },
                          },
                        ],
                      };

                      return (
                        <div className={styles["weather-slider"]}>
                          <Slider key={validDays.length} {...sliderSettings}>
                            {validDays.map((d, di) => {
                              const desc = d?.weather?.[0]?.description || "";
                              const t = Math.round(d?.temp?.day ?? 0);
                              const tMin = Math.round(d?.temp?.min ?? t);
                              const tMax = Math.round(d?.temp?.max ?? t);
                              const range = Math.max(1, tMax - tMin);
                              const pos = Math.min(
                                100,
                                Math.max(0, ((t - tMin) / range) * 100)
                              );
                              const icon = iconFromDesc(desc);

                              return (
                                <div key={`${d?.dt || di}`}>
                                  <div className={styles["weather-card"]}>
                                    <div className={styles["weather-card-header"]}>
                                      <div className={styles["weather-card-date"]}>
                                        {formatDay(d?.dt)}
                                      </div>
                                      <div
                                        className={styles["weather-card-icon"]}
                                        aria-label="weather-icon"
                                      >
                                        {icon}
                                      </div>
                                    </div>
                                    <div className={styles["weather-card-desc"]}>
                                      {desc}
                                    </div>
                                    <div className={styles["weather-card-temp"]}>
                                      <div className={styles["weather-card-temp-value"]}>
                                        {t}°C
                                      </div>
                                      <div className={styles["weather-card-temp-range"]}>
                                        min {tMin}° / max {tMax}°
                                      </div>
                                    </div>
                                    <div className={styles["weather-card-range"]}>
                                      <div
                                        className={styles["weather-card-range-fill"]}
                                        style={{ width: `${pos}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </Slider>
                        </div>
                      );
                    };
                    return (
                      <div key={`${w.cityKey}-${i}`} className={styles["tour-overview"]}>
                        <h3 className={styles["weather-city-title"]}>
                          {w.query}
                        </h3>
                        <WeatherCarousel days={w.days} />
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className={styles["tour-detail-content"]}>
        <div className={styles["container"]}>
          <div className={styles["tour-detail-grid"]}>
            {/* Left Column - Content */}
            <div className={styles["tour-detail-left"]}>
              {/* Tour Overview */}
              <div className={styles["tour-overview"]}>
                <h2>{t("tourPage.detail.overview.title")}</h2>
                <div
                  className={styles["tour-description-html"]}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      (tour.descriptionHtml || tour.description || "").replace(
                        /\n/g,
                        "<br/>"
                      )
                    ),
                  }}
                />
                {(tour.tourDeparturePoint || tour.tourVehicle) && (
                  <p className={styles["overview-paragraph"]}>
                    {t("tourPage.detail.overview.departVehicle", {
                      departure: tour.tourDeparturePoint || "...",
                      vehicle: tour.tourVehicle || "...",
                    })}
                  </p>
                )}
                <div style={{ marginTop: "10px" }}>
                  <ul className={styles["overview-list"]}>
                    <li>
                      <span className={styles["price-label"]}>
                        {t("tourPage.detail.overview.adultPrice")}:
                      </span>
                      <span className={styles["price-adult"]}>
                        {(tour.price ?? 0) > 0
                          ? formatPrice(tour.price)
                          : t("tourPage.detail.overview.free")}
                      </span>
                    </li>
                    <li>
                      <span className={styles["price-label"]}>
                        {t("tourPage.detail.overview.childrenPrice")}:
                      </span>
                      <span className={styles["price-child"]}>
                        {(tour.childrenPrice ?? 0) > 0
                          ? formatPrice(tour.childrenPrice)
                          : t("tourPage.detail.overview.free")}
                      </span>
                    </li>
                    <li>
                      <span className={styles["price-label"]}>
                        {t("tourPage.detail.overview.babyPrice")}:
                      </span>
                      <span className={styles["price-baby"]}>
                        {(tour.babyPrice ?? 0) > 0
                          ? formatPrice(tour.babyPrice)
                          : t("tourPage.detail.overview.free")}
                      </span>
                    </li>
                    {typeof tour.amount === "number" && (
                      <li>
                        <span className={styles["price-label"]}>
                          {t("tourPage.detail.overview.amount")}:
                        </span>
                        <span className={styles["muted"]}>{tour.amount}</span>
                      </li>
                    )}
                    {Array.isArray(tour.availableDates) &&
                      tour.availableDates.length > 0 && (
                        <li>
                          <span className={styles["price-label"]}>
                            {t("tourPage.detail.overview.availableDates")}:
                          </span>
                          <span className={styles["muted"]}>
                            {tour.availableDates.join(", ")}
                          </span>
                        </li>
                      )}
                  </ul>
                </div>

                <div className={styles["voucher-section"]}>
                  <div className={styles["voucher-section-header"]}>
                    <div>
                      <h3>{t("tourPage.detail.vouchers.title")}</h3>
                      <p>{t("tourPage.detail.vouchers.subtitle")}</p>
                    </div>
                  </div>

                  {voucherLoading && (
                    <div className={styles["voucher-loading"]}>
                      {t("tourPage.detail.vouchers.loading")}
                    </div>
                  )}

                  {!voucherLoading && voucherError && (
                    <div className={styles["voucher-error"]}>{voucherError}</div>
                  )}

                  {!voucherLoading &&
                    !voucherError &&
                    voucherEmptyReason && (
                      <div className={styles["voucher-empty"]}>
                        {voucherEmptyReason}
                      </div>
                    )}

                  {!voucherLoading &&
                    !voucherError &&
                    voucherSuggestions.length > 0 && (
                      <>
                        <div className={styles["voucher-list"]}>
                          {voucherSuggestions.slice(0, 3).map((voucher) => {
                            // --- LOGIC XỬ LÝ DỮ LIỆU ---
                            const rawDiscountType =
                              voucher.discountType ||
                              voucher.meta?.discountType ||
                              "PERCENT";
                            const discountType =
                              rawDiscountType === "FIXED"
                                ? "AMOUNT"
                                : rawDiscountType === "AMOUNT"
                                ? "AMOUNT"
                                : "PERCENT";

                            const voucherCode =
                              voucher.voucherCode ||
                              voucher.code ||
                              voucher.meta?.code ||
                              "";
                            const voucherName =
                              voucher?.meta?.name ||
                              voucher.name ||
                              t("tourPage.detail.vouchers.unknownName");

                            const startDate =
                              voucher.startDate || voucher.meta?.startDate || "";
                            const endDate =
                              voucher.endDate || voucher.meta?.endDate || "";

                            const discountValueDisplay =
                              voucher.discountValue ||
                              voucher.meta?.discountValue ||
                              0;

                            // --- RENDER ---
                            return (
                              <div
                                key={
                                  voucher.voucherId ||
                                  voucher.id ||
                                  voucherCode
                                }
                                className={styles["voucher-card-horizontal"]}
                              >
                                {/* Status Badge */}
                                {getStatusBadge({
                                  endDate,
                                  meta: { endDate },
                                })}

                                {/* LEFT SECTION (MÀU) */}
                                <div
                                  className={`${styles["voucher-left-section"]} ${
                                    discountType === "PERCENT"
                                      ? styles["voucher-header-gradient-percent"]
                                      : styles["voucher-header-gradient-amount"]
                                  }`}
                                >
                                  <div className={styles["voucher-left-content"]}>
                                    {discountType === "PERCENT" ? (
                                      <>
                                        <Percent
                                          className={styles["voucher-icon-large"]}
                                        />
                                        <div
                                          className={styles["voucher-value-wrapper"]}
                                        >
                                          <span
                                            className={styles["voucher-value-text"]}
                                          >
                                            {discountValueDisplay}
                                          </span>
                                          <span
                                            className={styles["voucher-value-symbol"]}
                                          >
                                            %
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <Banknote
                                          className={styles["voucher-icon-large"]}
                                        />
                                        <div
                                          className={styles["voucher-value-wrapper"]}
                                        >
                                          <span
                                            className={
                                              styles["voucher-value-text-small"]
                                            }
                                          >
                                            {formatCurrency(discountValueDisplay)
                                              .replace(/₫/g, "")
                                              .trim()}
                                          </span>
                                          <span
                                            className={styles["voucher-value-symbol"]}
                                          >
                                            ₫
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div className={styles["voucher-code-container"]}>
                                    <span className={styles["voucher-code-text"]}>
                                      {voucherCode}
                                    </span>
                                  </div>
                                </div>

                                {/* RIGHT SECTION (TRẮNG) */}
                                <div className={styles["voucher-right-section"]}>
                                  <div>
                                    <div className={styles["voucher-info-top"]}>
                                      <h3 className={styles["voucher-title"]}>
                                        {voucherName}
                                      </h3>
                                      <div className={styles["voucher-subtitle"]}>
                                        {discountType === "PERCENT"
                                          ? `Giảm ${discountValueDisplay}%`
                                          : `Giảm ${formatCurrency(
                                              discountValueDisplay
                                            )}`}
                                      </div>
                                    </div>

                                    <div className={styles["voucher-date-box"]}>
                                      <div className={styles["voucher-date-row"]}>
                                        <Calendar
                                          size={14}
                                          className={styles["voucher-icon-small"]}
                                        />
                                        <span
                                          className={styles["voucher-date-label"]}
                                        >
                                          {t("tourPage.detail.vouchers.periodLabel")}
                                        </span>
                                        {getDaysLeftText({ endDate }) && (
                                          <span
                                            className={
                                              styles["voucher-countdown-badge"]
                                            }
                                          >
                                            {getDaysLeftText({ endDate })}
                                          </span>
                                        )}
                                      </div>
                                      <div className={styles["voucher-date-range"]}>
                                        {t("tourPage.detail.vouchers.fromDate")}{" "}
                                        {formatDate(startDate)} <br />
                                        {t("tourPage.detail.vouchers.toDate")}{" "}
                                        {formatDate(endDate)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className={styles["voucher-actions"]}>
                                    <button
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(
                                            voucherCode
                                          );
                                          showSuccess(
                                            t(
                                              "tourPage.detail.vouchers.copySuccess",
                                              { code: voucherCode }
                                            )
                                          );
                                        } catch {
                                          const textArea =
                                            document.createElement("textarea");
                                          textArea.value = voucherCode;
                                          document.body.appendChild(textArea);
                                          textArea.select();
                                          document.execCommand("copy");
                                          document.body.removeChild(textArea);
                                          showSuccess(
                                            t(
                                              "tourPage.detail.vouchers.copySuccess",
                                              { code: voucherCode }
                                            )
                                          );
                                        }
                                      }}
                                      className={`${styles["btn-copy"]} ${
                                        discountType === "PERCENT"
                                          ? styles[
                                              "voucher-button-gradient-percent"
                                            ]
                                          : styles[
                                              "voucher-button-gradient-amount"
                                            ]
                                      }`}
                                    >
                                      {t("tourPage.detail.vouchers.copyButton")}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const vId =
                                          voucher.voucherId || voucher.id;
                                        if (vId) {
                                          setSelectedVoucherId(vId);
                                          setIsVoucherModalOpen(true);
                                        }
                                      }}
                                      className={styles["btn-detail"]}
                                    >
                                      <Eye size={14} />{" "}
                                      {t("tourPage.detail.vouchers.detailButton")}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className={styles["voucher-footer"]}>
                          <span className={styles["voucher-help-text"]}>
                            {t("tourPage.detail.vouchers.footerHelper")}
                          </span>
                          {voucherSuggestions.length > 3 && (
                            <button
                              type="button"
                              className={styles["voucher-cta"]}
                              onClick={() => setIsVoucherListModalOpen(true)}
                            >
                              {t("tourPage.detail.vouchers.cta")}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                </div>
              </div>

              {/* Itinerary, Gallery, Reviews are rendered after the grid */}
            </div>

            {/* Right Column - Booking Info (inside grid) */}
            <div className={styles["tour-detail-right"]}>
              <div className={styles["booking-card"]}>
                <div className={styles["booking-header"]}>
                  <div className={styles["price-section"]}>
                    <span
                      className={`${styles["price-label"]} ${styles["booking-price-label-sm"]}`}
                    >
                      {t("tourPage.detail.booking.price")}
                    </span>
                    <span className={styles["price-amount"]}>
                      {formatPrice(tour.price)}
                    </span>
                  </div>
                  <div className={styles["price-note"]}>
                    <span className={styles["booking-included-note"]}>
                      {t("tourPage.detail.booking.includedNote")}
                    </span>
                  </div>
                </div>

                <div className={styles["price-breakdown"]}>
                  <div className={styles["price-row"]}>
                    <span className={styles["booking-row-label"]}>
                      {t("tourPage.detail.booking.children")}
                    </span>
                    <span
                      className={styles["booking-children-price"]}
                    >
                      {(tour.childrenPrice ?? 0) > 0
                        ? formatPrice(tour.childrenPrice)
                        : t("tourPage.detail.overview.free")}
                    </span>
                  </div>
                  <div className={styles["price-row"]}>
                    <span className={styles["booking-row-label"]}>
                      {t("tourPage.detail.booking.baby")}
                    </span>
                    <span
                      className={styles["booking-baby-price"]}
                    >
                      {(tour.babyPrice ?? 0) > 0
                        ? formatPrice(tour.babyPrice)
                        : t("tourPage.detail.overview.free")}
                    </span>
                  </div>
                </div>

                <div className={styles["booking-actions"]}>
                  <button
                    className={styles["book-now-btn"]}
                    onClick={handleBookNow}
                    disabled={isCompany}
                    aria-disabled={isCompany ? "true" : "false"}
                    tabIndex={isCompany ? -1 : 0}
                    title={
                      isCompany
                        ? "Tài khoản doanh nghiệp không thể đặt tour"
                        : undefined
                    }
                    style={
                      isCompany
                        ? {
                            pointerEvents: "none",
                            cursor: "not-allowed",
                            opacity: 0.6,
                          }
                        : undefined
                    }
                  >
                    {t("tourPage.detail.booking.bookNow")}
                  </button>
                </div>
              </div>
            </div>
            {/* Close grid (left + right columns) */}
          </div>
          {/* Row 2: Tour Itinerary - full width */}
          <div className={styles["tour-itinerary"]}>
            <div className={styles["itinerary-header"]}>
              <h2>{t("tourPage.detail.itinerary.header")}</h2>
            </div>
            <div className={styles["itinerary-list"]}>
              {itinerary.length === 0 ? (
                <div className={styles["itinerary-item"]}>
                  <div className={styles["itinerary-content"]}>
                    <p className={styles["activity"]}>
                      {t("tourPage.detail.itinerary.updating")}
                    </p>
                  </div>
                </div>
              ) : (
                itinerary.map((day, index) => {
                  const titleFromAPI =
                    day.dayTitle || day.tourContentTitle || "";
                  const headerTitle =
                    titleFromAPI && titleFromAPI.trim().length > 0
                      ? titleFromAPI
                      : t("tourPage.detail.itinerary.day", {
                          index: index + 1,
                        });
                  return (
                    <div className={styles["itinerary-item"]} key={index}>
                      <div
                        className={styles["itinerary-day-header"]}
                        style={{
                          background: day.dayColor
                            ? `linear-gradient(135deg, ${
                                day.dayColor
                              }, ${shadeColor(day.dayColor, -20)})`
                            : undefined,
                        }}
                      >
                        <span
                          className={styles["day-destination"]}
                          style={{
                            textAlign: day.titleAlignment || "left",
                            display: "block",
                            width: "100%",
                          }}
                        >
                          {headerTitle}
                        </span>
                      </div>
                      {(day.description ||
                        day.tourContentDescription ||
                        day.activities) && (
                        <div className={styles["itinerary-content"]}>
                          <div className={styles["time-schedule"]}>
                            <div className={styles["time-item"]}>
                              <span
                                className={styles["activity"]}
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeHtml(
                                    day.description ||
                                      day.tourContentDescription ||
                                      day.activities ||
                                      ""
                                  ),
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Row 3: Ratings & Reviews - full width */}
          <div className={styles["tour-reviews"]} style={{ marginTop: "32px" }}>
            <h2>
              {t("tourPage.detail.reviews.title") || "Đánh giá & Nhận xét"}
            </h2>
            {/* Create Rating */}
            {user && canRate && (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 16,
                  margin: "12px 0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewStar(s)}
                      aria-label={`star-${s}`}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 22,
                        color: s <= newStar ? "#f59e0b" : "#d1d5db",
                      }}
                    >
                      ★
                    </button>
                  ))}
                  <span
                    style={{
                      marginLeft: 8,
                      color: "#6b7280",
                      fontWeight: 700,
                    }}
                  >
                    {newStar}/5
                  </span>
                </div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    t("tourPage.detail.reviews.placeholder") ||
                    "Chia sẻ trải nghiệm của bạn..."
                  }
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: 10,
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    minHeight: 80,
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={async () => {
                      await submitRating({
                        star: newStar,
                        comment: newComment,
                      });
                      setNewComment("");
                      setNewStar(5);
                      await refresh();
                    }}
                    className={styles["book-now-btn"]}
                  >
                    {t("tourPage.detail.reviews.submit") || "Gửi đánh giá"}
                  </button>
                </div>
              </div>
            )}

            {/* Summary */}
            <div
              className={styles["reviews-summary"]}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "16px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#f8fafc",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {[5, 4, 3, 2, 1].map((s) => {
                  const count = ratingStats.dist[s - 1] || 0;
                  const percent = ratingStats.total
                    ? (count / ratingStats.total) * 100
                    : 0;
                  return (
                    <div
                      key={s}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          fontSize: 12,
                          color: "#6b7280",
                        }}
                      >
                        {s}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 8,
                          background: "#e5e7eb",
                          borderRadius: 999,
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: "100%",
                            background: "#f59e0b",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ minWidth: 100, textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
                  {formatAvg(ratingStats.avg)}
                </div>
                <div
                  style={{
                    color: "#f59e0b",
                    letterSpacing: 1,
                    margin: "4px 0",
                  }}
                >
                  {"★★★★★".split("").map((ch, i) => (
                    <span
                      key={i}
                      style={{
                        color:
                          i + 1 <= Math.round(ratingStats.avg)
                            ? "#f59e0b"
                            : "#e5e7eb",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {ratingStats.total} {t("forum.post.comments") || "đánh giá"}
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {ratings.length === 0 ? (
                <div style={{ color: "#6b7280" }}>
                  {t("tourPage.detail.reviews.empty") ||
                    "Chưa có đánh giá nào."}
                </div>
              ) : (
                ratings.map((r) => (
                  <div
                    key={r.tourRatedId}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            style={{
                              color: s <= (r.star || 0) ? "#f59e0b" : "#d1d5db",
                              fontSize: 16,
                            }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                        }}
                      >
                        <span style={{ color: "#9ca3af", fontSize: 12 }}>
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                        {user &&
                          [user.userId, user.id, user.user_id]
                            .filter(Boolean)
                            .some(
                              (mid) => String(mid) === String(r.userId)
                            ) && (
                            <div
                              style={{ position: "relative", marginTop: 4 }}
                              data-menu-id={r.tourRatedId}
                            >
                              <button
                                aria-label="more"
                                onClick={() =>
                                  setOpenMenuId(
                                    openMenuId === r.tourRatedId
                                      ? null
                                      : r.tourRatedId
                                  )
                                }
                                style={{
                                  background:
                                    openMenuId === r.tourRatedId
                                      ? "#f3f4f6"
                                      : "transparent",
                                  border:
                                    "1px solid " +
                                    (openMenuId === r.tourRatedId
                                      ? "#e5e7eb"
                                      : "transparent"),
                                  cursor: "pointer",
                                  color: "#6b7280",
                                  padding: 6,
                                  lineHeight: 1,
                                  fontSize: 16,
                                  borderRadius: "999px",
                                  transition: "background 0.2s",
                                }}
                              >
                                <MoreVertical className={styles["menu-icon"]} />
                              </button>
                              {openMenuId === r.tourRatedId && (
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: 26,
                                    background: "#fff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 10,
                                    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                                    overflow: "hidden",
                                    minWidth: 120,
                                  }}
                                >
                                  <button
                                    onClick={() => {
                                      setConfirmDeleteId(r.tourRatedId);
                                      setOpenMenuId(null);
                                    }}
                                    style={{
                                      background: "#ef4444",
                                      border: "none",
                                      padding: "10px 14px",
                                      cursor: "pointer",
                                      color: "#ffffff",
                                      width: "100%",
                                      fontWeight: 700,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      borderRadius: 8,
                                    }}
                                  >
                                    <Trash2 className={styles["delete-icon"]} />
                                    <span>{t("tourPage.detail.reviews.delete") ||
                                      "Xóa"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <img
                        src={"/default-avatar.png"}
                        alt="avatar"
                        style={{ width: 24, height: 24, borderRadius: "50%" }}
                      />
                      <span
                        style={{
                          color: "#374151",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {r.username ||
                          r.fullName ||
                          r.name ||
                          r.email ||
                          (r.userId ? `User #${r.userId}` : "Ẩn danh")}
                      </span>
                    </div>
                    {r.comment && (
                      <div
                        style={{
                          marginTop: 6,
                          color: "#374151",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {r.comment}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Delete Confirm Modal */}
            <DeleteConfirmModal
              isOpen={!!confirmDeleteId}
              onClose={() => setConfirmDeleteId(null)}
              onConfirm={async () => {
                if (confirmDeleteId) {
                  await deleteRating(confirmDeleteId);
                  await refresh();
                  setConfirmDeleteId(null);
                }
              }}
              title={t("common.deleteConfirm.title")}
              itemName={t("tourPage.detail.reviews.title")}
            />
          </div>
        </div>
      </div>
      <ShareTourModal
        isOpen={openShare}
        onClose={() => setOpenShare(false)}
        tourId={id}
        onShared={() => {
          navigate("/forum");
        }}
      />
      <LoginRequiredModal
        isOpen={showLoginRequired}
        onClose={() => setShowLoginRequired(false)}
        title={t("auth.loginRequired.title")}
        message={t("auth.loginRequired.message")}
        returnTo={`/tour/detail?id=${id}`}
      />
      <VoucherDetailModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setSelectedVoucherId(null);
        }}
        voucherId={selectedVoucherId}
      />
      <VoucherListModal
        isOpen={isVoucherListModalOpen}
        onClose={() => setIsVoucherListModalOpen(false)}
        vouchers={voucherSuggestions}
        onVoucherClick={(voucherId) => {
          setSelectedVoucherId(voucherId);
          setIsVoucherListModalOpen(false);
          setIsVoucherModalOpen(true);
        }}
      />
    </div>
  );
};

export default TourDetailPage;

