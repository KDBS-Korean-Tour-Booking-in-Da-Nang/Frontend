import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useToursAPI } from "../../../hooks/useToursAPI";
import styles from "./TourDetailPage.module.css";
import { ShareTourModal, LoginRequiredModal } from "../../../components";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";
import { useTourRated } from "../../../hooks/useTourRated";
import useWeatherFromTour from "../../../hooks/useWeatherFromTour";
import DeleteConfirmModal from "../../../components/modals/DeleteConfirmModal/DeleteConfirmModal";

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
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchTourById, loading, error } = useToursAPI();
  const { t } = useTranslation();
  const [tour, setTour] = useState(null);
  const { user } = useAuth();
  const { showError } = useToast();
  const location = useLocation();
  const [openShare, setOpenShare] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const {
    ratings,
    submitRating,
    deleteRating,
    canRate,
    refresh,
  } = useTourRated(id);
  const [newStar, setNewStar] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
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
    const loadTour = async () => {
      try {
        const tourData = await fetchTourById(parseInt(id));
        setTour(tourData);
      } catch (error) {
        console.error("Error loading tour:", error);
        navigate("/tour");
      }
    };

    if (id) {
      loadTour();
    }
  }, [id, navigate]); // Removed fetchTourById from dependencies

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

  const handleBookNow = () => {
    if (!user) {
      setShowLoginRequired(true);
      return;
    }
    if (user && user.role === "COMPANY") {
      showError("Tài khoản doanh nghiệp không thể đặt tour.");
      return;
    }
    // Clear any previous booking wizard data for this tour before starting a new booking
    localStorage.removeItem(`bookingData_${id}`);
    localStorage.removeItem(`hasConfirmedLeave_${id}`);
    sessionStorage.removeItem("pendingBooking");
    navigate(`/tour/${id}/booking`);
  };

  const handleBackToList = () => {
    navigate("/tour");
  };

  const handleBackToManagement = () => {
    navigate("/company/tours");
  };

  const handleShare = () => {
    if (!user) {
      setShowLoginRequired(true);
      return;
    }
    setOpenShare(true);
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
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                {t("tourPage.detail.backToManagement")}
              </button>
            ) : (
              <button
                onClick={handleBackToList}
                className={styles["back-button"]}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                {t("tourPage.detail.back")}
              </button>
            )}

            <div className={styles["hero-info"]}>
              <div className={styles["hero-badge"]}>
                <span>{t("tourPage.detail.badge")}</span>
              </div>
              <h1 className={styles["hero-title"]}>{tour.title}</h1>
              <div className={styles["hero-meta"]}>
                <div className={styles["meta-item"]}>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{tour.duration}</span>
                </div>
                <div className={styles["meta-item"]}>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>
                    {tour.category === "domestic"
                      ? "Trong nước"
                      : tour.category === "international"
                      ? "Nước ngoài"
                      : "Trong ngày"}
                  </span>
                </div>
                <div className={styles["meta-item"]}>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                  <span>4.8/5 (127 đánh giá)</span>
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
                      const VISIBLE = 4;
                      const baseDays = (days || []).slice(0, 6);
                      const n = baseDays.length;
                      
                      // Clone items ở cả đầu và cuối để tạo vòng lặp mượt không có điểm dừng
                      // Format: [clone cuối] + baseDays + [clone đầu]
                      // Bắt đầu từ index n (item đầu tiên của baseDays thật)
                      const cloneCount = n >= VISIBLE ? VISIBLE : n;
                      const infiniteDays = n > 0 
                        ? [...baseDays.slice(-cloneCount), ...baseDays, ...baseDays.slice(0, cloneCount)]
                        : [];

                      // Bắt đầu từ index cloneCount (item đầu tiên của baseDays thật)
                      const [idx, setIdx] = useState(n > 0 ? cloneCount : 0);
                      const [noTransition, setNoTransition] = useState(true); // start without transition
                      const trackRef = useRef(null);
                      const stepPxRef = useRef(0);

                      // NEW: time-based autoplay with RAF
                      const STEP_MS = 4000;
                      const lastStepRef = useRef(performance.now());
                      const rafRef = useRef(0);
                      const pausedRef = useRef(false);
                      const hiddenAtRef = useRef(null);

                      // Reset về vị trí ban đầu khi dữ liệu thay đổi: set without transition then enable
                      useEffect(() => {
                        if (n > 0) {
                          setNoTransition(true);
                          setIdx(cloneCount);
                          requestAnimationFrame(() => {
                            requestAnimationFrame(() => setNoTransition(false));
                          });
                        }
                      }, [n, cloneCount]);

                      const measure = () => {
                        const track = trackRef.current;
                        if (!track) return;
                        const card = track.querySelector(`.${styles["weather-card"]}`);
                        if (!card) return;
                        const cardWidth = card.getBoundingClientRect().width;
                        const cs = getComputedStyle(track);
                        const gap = parseFloat(cs.gap || "12");
                        stepPxRef.current = cardWidth + gap;
                      };

                      useEffect(() => {
                        measure();
                        const ro = new ResizeObserver(() => measure());
                        if (trackRef.current) ro.observe(trackRef.current);
                        window.addEventListener("resize", measure);
                        return () => {
                          ro.disconnect();
                          window.removeEventListener("resize", measure);
                        };
                      }, []);

                      // Visibility: compute missed steps and replay smoothly
                      useEffect(() => {
                        const onVis = () => {
                          if (document.hidden) {
                            hiddenAtRef.current = performance.now();
                            return;
                          }
                          const now = performance.now();
                          const hiddenFor = hiddenAtRef.current ? (now - hiddenAtRef.current) : 0;
                          hiddenAtRef.current = null;
                          const missed = Math.floor(hiddenFor / STEP_MS);
                          if (missed > 0) {
                            let i = 0;
                            const PLAY_DELAY = 250;
                            const playOne = () => {
                              setIdx((c) => c + 1);
                              i += 1;
                              if (i < missed) setTimeout(playOne, PLAY_DELAY);
                            };
                            setTimeout(playOne, 0);
                            lastStepRef.current = now;
                          } else {
                            lastStepRef.current = now;
                          }
                        };
                        document.addEventListener("visibilitychange", onVis);
                        return () => document.removeEventListener("visibilitychange", onVis);
                      }, []);

                      // RAF autoplay loop
                      useEffect(() => {
                        if (n === 0) return;
                        const loop = (t) => {
                          if (!pausedRef.current && !document.hidden) {
                            if (t - lastStepRef.current >= STEP_MS) {
                              const steps = Math.floor((t - lastStepRef.current) / STEP_MS);
                              // Advance exactly one visual step to keep cadence
                              setIdx((c) => c + 1);
                              lastStepRef.current += steps * STEP_MS;
                            }
                          }
                          rafRef.current = requestAnimationFrame(loop);
                        };
                        rafRef.current = requestAnimationFrame(loop);
                        return () => cancelAnimationFrame(rafRef.current);
                      }, [n, STEP_MS]);

                      const handleTransitionEnd = () => {
                        // Khi đã trượt đến clone items ở cuối (cloneCount + n), reset về cloneCount (đầu baseDays thật)
                        if (idx >= cloneCount + n) {
                          setNoTransition(true);
                          setIdx(cloneCount);
                          requestAnimationFrame(() => {
                            requestAnimationFrame(() => setNoTransition(false));
                          });
                        }
                        // Khi lùi về clone items ở đầu (< 0 hoặc < cloneCount), reset về cuối baseDays thật
                        if (idx < cloneCount) {
                          setNoTransition(true);
                          setIdx(cloneCount + n - 1);
                          requestAnimationFrame(() => {
                            requestAnimationFrame(() => setNoTransition(false));
                          });
                        }
                      };

                      const onMouseEnter = () => { pausedRef.current = true; };
                      const onMouseLeave = () => { pausedRef.current = false; };

                      const translate = -(idx * stepPxRef.current);

                      return (
                        <div
                          className={styles["weather-viewport"]}
                          style={{ "--w-cols": VISIBLE }}
                          onMouseEnter={onMouseEnter}
                          onMouseLeave={onMouseLeave}
                        >
                          <div
                            ref={trackRef}
                            className={styles["weather-track"]}
                            style={{ transform: `translateX(${translate}px)`, transition: noTransition ? "none" : undefined }}
                            onTransitionEnd={handleTransitionEnd}
                          >
                            {infiniteDays.map((d, di) => {
                              const desc = d?.weather?.[0]?.description || "";
                              const t = Math.round(d?.temp?.day ?? 0);
                              const tMin = Math.round(d?.temp?.min ?? t);
                              const tMax = Math.round(d?.temp?.max ?? t);
                              const range = Math.max(1, tMax - tMin);
                              const pos = Math.min(100, Math.max(0, ((t - tMin) / range) * 100));
                              const icon = iconFromDesc(desc);
                              return (
                                <div key={di} className={styles["weather-card"]}>
                                  <div className={styles["weather-card-header"]}>
                                    <div className={styles["weather-card-date"]}>{formatDay(d?.dt)}</div>
                                    <div className={styles["weather-card-icon"]} aria-label="weather-icon">{icon}</div>
                                  </div>
                                  <div className={styles["weather-card-desc"]}>{desc}</div>
                                  <div className={styles["weather-card-temp"]}>
                                    <div className={styles["weather-card-temp-value"]}>{t}°C</div>
                                    <div className={styles["weather-card-temp-range"]}>min {tMin}° / max {tMax}°</div>
                                  </div>
                                  <div className={styles["weather-card-range"]}>
                                    <div className={styles["weather-card-range-fill"]} style={{ width: `${pos}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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
                      style={{ color: "#16a34a" }}
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
                      style={{ color: "#f59e0b" }}
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
                  <button className={styles["contact-btn"]}>
                    {t("tourPage.detail.booking.contact")}
                  </button>
                  <button
                    className={styles["book-now-btn"]}
                    onClick={handleShare}
                  >
                    {t("tourCard.share") || "Share"}
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
          {/* Row 3: Tour Gallery - full width */}
          <div className={styles["tour-gallery"]}>
            <h2>{t("tourPage.detail.gallery.title")}</h2>
            <div className={styles["gallery-grid"]}>
              {[tour.image || "/default-Tour.jpg", ...(tour.gallery || [])]
                .filter(Boolean)
                .slice(0, 4)
                .map((img, idx) => (
                  <div className={styles["gallery-item"]} key={idx}>
                    <img
                      src={img}
                      alt={`Gallery ${idx + 1}`}
                      onError={(e) => {
                        e.target.src = "/default-Tour.jpg";
                      }}
                    />
                    <div className={styles["gallery-overlay"]}>
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          {/* Row 4: Ratings & Reviews - full width */}
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
                {[5, 4, 3, 2, 1].map((s, idx) => {
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
                                ⋮
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
                                    {t("tourPage.detail.reviews.delete") ||
                                      "Xóa"}
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
        returnTo={`/tour/${id}`}
      />
    </div>
  );
};

export default TourDetailPage;

