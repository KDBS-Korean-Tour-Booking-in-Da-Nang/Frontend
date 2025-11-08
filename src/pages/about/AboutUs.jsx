import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./AboutUs.module.css";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const bannerImages = [
  "https://phongma.vn/wp-content/uploads/2018/06/30-dia-diem-du-lich-da-nang-du-la-van-chua-het-hot-trong-nam-2017-phan-1-1-1024x601.jpg",
  "https://trivietagency.com/wp-content/uploads/2025/04/du-lich-da-nang.jpg",
  "https://intour.vn/upload/img/0f70a9710eb8c8bd31bb847ec81b5dd0/2022/03/14/cac_dia_diem_du_lich_noi_tieng_o_da_nang_thu_hut_khach_du_lich_quanh_nam_1647251151.png",
  "https://dulichkhamphahue.com/wp-content/uploads/2020/07/dia_diem_tham_quan_mien_phi_o_da_nang_nam_o_d.jpg",
];

const AboutUs = () => {
  const { t } = useTranslation();
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const missionRef = useRef(null);
  const valuesRef = useRef(null);
  const teamRef = useRef(null);
  const statsRef = useRef(null);
  const timelineRef = useRef(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const carouselIntervalRef = useRef(null);

  // Sample data
  const missionData = {
    title: t("about.mission.title", { defaultValue: "Sứ Mệnh Của Chúng Tôi" }),
    description: t("about.mission.description", {
      defaultValue:
        "KDBS cam kết mang đến những trải nghiệm du lịch tuyệt vời, kết nối văn hóa Hàn Quốc và Đà Nẵng thông qua các tour du lịch chất lượng cao và dịch vụ chuyên nghiệp.",
    }),
  };

  const values = [
    {
      icon: "🎯",
      title: t("about.values.quality.title", { defaultValue: "Chất Lượng" }),
      description: t("about.values.quality.desc", {
        defaultValue: "Cam kết mang đến dịch vụ tốt nhất cho khách hàng",
      }),
    },
    {
      icon: "🤝",
      title: t("about.values.trust.title", { defaultValue: "Tin Cậy" }),
      description: t("about.values.trust.desc", {
        defaultValue:
          "Xây dựng niềm tin thông qua sự minh bạch và chuyên nghiệp",
      }),
    },
    {
      icon: "🌟",
      title: t("about.values.excellence.title", { defaultValue: "Xuất Sắc" }),
      description: t("about.values.excellence.desc", {
        defaultValue: "Không ngừng cải thiện và nâng cao chất lượng dịch vụ",
      }),
    },
    {
      icon: "❤️",
      title: t("about.values.passion.title", { defaultValue: "Đam Mê" }),
      description: t("about.values.passion.desc", {
        defaultValue: "Đam mê với du lịch và kết nối văn hóa",
      }),
    },
  ];

  const teamMembers = [
    {
      name: t("about.team.member1.name", { defaultValue: "Nguyễn Văn A" }),
      role: t("about.team.member1.role", { defaultValue: "CEO & Founder" }),
      description: t("about.team.member1.desc", {
        defaultValue: "Hơn 10 năm kinh nghiệm trong ngành du lịch",
      }),
    },
    {
      name: t("about.team.member2.name", { defaultValue: "Trần Thị B" }),
      role: t("about.team.member2.role", {
        defaultValue: "Giám Đốc Marketing",
      }),
      description: t("about.team.member2.desc", {
        defaultValue: "Chuyên gia về marketing du lịch và truyền thông",
      }),
    },
    {
      name: t("about.team.member3.name", { defaultValue: "Lê Văn C" }),
      role: t("about.team.member3.role", { defaultValue: "Giám Đốc Vận Hành" }),
      description: t("about.team.member3.desc", {
        defaultValue: "Đảm bảo chất lượng dịch vụ và trải nghiệm khách hàng",
      }),
    },
  ];

  const stats = [
    {
      number: "10,000+",
      label: t("about.stats.customers", { defaultValue: "Khách Hàng" }),
    },
    {
      number: "500+",
      label: t("about.stats.tours", { defaultValue: "Tour Du Lịch" }),
    },
    {
      number: "98%",
      label: t("about.stats.satisfaction", { defaultValue: "Hài Lòng" }),
    },
    {
      number: "50+",
      label: t("about.stats.partners", { defaultValue: "Đối Tác" }),
    },
  ];

  // Carousel auto-play
  useEffect(() => {
    carouselIntervalRef.current = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerImages.length);
    }, 4000); // Change image every 4 seconds

    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animation
      const heroTl = gsap.timeline();
      heroTl
        .from(titleRef.current, {
          y: 100,
          opacity: 0,
          duration: 1,
          ease: "power4.out",
        })
        .from(
          subtitleRef.current,
          {
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
          },
          "-=0.5"
        );

      // Mission section animation
      gsap.from(missionRef.current?.children || [], {
        scrollTrigger: {
          trigger: missionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
      });

      // Values cards animation
      if (valuesRef.current) {
        gsap.from(valuesRef.current.children, {
          scrollTrigger: {
            trigger: valuesRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
          scale: 0.8,
          opacity: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: "back.out(1.7)",
        });
      }

      // Team members animation
      if (teamRef.current) {
        gsap.from(teamRef.current.children, {
          scrollTrigger: {
            trigger: teamRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
          y: 80,
          opacity: 0,
          rotationX: -15,
          duration: 0.8,
          stagger: 0.2,
          ease: "power3.out",
        });
      }

      // Stats counter animation
      if (statsRef.current) {
        const statElements = Array.from(statsRef.current.children);
        statElements.forEach((stat, index) => {
          const numberElement = stat.querySelector(".stat-number");
          if (!numberElement) return;

          const number = numberElement.textContent || "0";
          const isPercentage = number.includes("%");
          const numericValue = parseFloat(number.replace(/[^0-9.]/g, "")) || 0;

          // Create a counter object for animation
          const counter = { value: 0 };

          gsap.from(stat, {
            scrollTrigger: {
              trigger: stat,
              start: "top 90%",
              toggleActions: "play none none none",
            },
            scale: 0,
            opacity: 0,
            duration: 0.5,
            delay: index * 0.1,
            ease: "back.out(1.7)",
            onComplete: () => {
              // Animate counter
              gsap.to(counter, {
                value: numericValue,
                duration: 2,
                ease: "power2.out",
                onUpdate: function () {
                  const currentValue = Math.round(counter.value);
                  if (isPercentage) {
                    numberElement.textContent = `${currentValue}%`;
                  } else if (number.includes("+")) {
                    numberElement.textContent = `${currentValue.toLocaleString()}+`;
                  } else {
                    numberElement.textContent = currentValue.toLocaleString();
                  }
                },
              });
            },
          });
        });
      }

      // Parallax effect for hero
      gsap.to(heroRef.current, {
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
        y: 100,
        opacity: 0.3,
      });
    }, timelineRef);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div className="page-gradient min-h-screen">
      <div ref={timelineRef}>
        {/* Hero Section with Carousel */}
        <section ref={heroRef} className={styles["banner-carousel"]}>
          <div className={styles["carousel-wrapper"]}>
            {bannerImages.map((img, index) => (
              <div
                key={index}
                className={`${styles["carousel-slide"]} ${
                  index === currentBannerIndex ? styles["active"] : ""
                }`}
              >
                <img src={img} alt={`Banner ${index + 1}`} />
                <div className={styles["banner-overlay"]}>
                  <div className={styles["banner-content"]}>
                    <h1 ref={titleRef} className={styles["banner-title"]}>
                      {t("about.hero.title", { defaultValue: "Về Chúng Tôi" })}
                    </h1>
                    <p
                      ref={subtitleRef}
                      className={styles["banner-description"]}
                    >
                      {t("about.hero.subtitle", {
                        defaultValue:
                          "Kết nối văn hóa Hàn Quốc và Đà Nẵng thông qua những trải nghiệm du lịch đáng nhớ",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles["carousel-dots"]}>
            {bannerImages.map((_, index) => (
              <button
                key={index}
                className={`${styles["dot"]} ${
                  index === currentBannerIndex ? styles["active"] : ""
                }`}
                onClick={() => {
                  setCurrentBannerIndex(index);
                  if (carouselIntervalRef.current) {
                    clearInterval(carouselIntervalRef.current);
                  }
                  carouselIntervalRef.current = setInterval(() => {
                    setCurrentBannerIndex(
                      (prev) => (prev + 1) % bannerImages.length
                    );
                  }, 4000);
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        {/* Mission Section */}
        <section ref={missionRef} className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl p-12 md:p-16 transform transition-all duration-500 hover:shadow-3xl hover:scale-[1.02]">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-center">
                {missionData.title}
              </h2>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-center max-w-4xl mx-auto">
                {missionData.description}
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section ref={statsRef} className="py-20 px-6 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="stat-card bg-white rounded-2xl p-8 shadow-lg text-center transform transition-all duration-300 hover:scale-110 hover:shadow-2xl"
                >
                  <div className="stat-number text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section ref={valuesRef} className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">
              {t("about.values.title", { defaultValue: "Giá Trị Cốt Lõi" })}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-8 shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:-translate-y-2"
                >
                  <div className="text-6xl mb-4 text-center animate-bounce">
                    {value.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 text-center leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section ref={teamRef} className="py-20 px-6 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">
              {t("about.team.title", { defaultValue: "Đội Ngũ Của Chúng Tôi" })}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-8 shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-pink-400 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                    {member.name.charAt(0)}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                    {member.name}
                  </h3>
                  <p className="text-lg text-blue-600 font-semibold mb-4 text-center">
                    {member.role}
                  </p>
                  <p className="text-gray-600 text-center leading-relaxed">
                    {member.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl p-12 md:p-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">
                {t("about.story.title", {
                  defaultValue: "Câu Chuyện Của Chúng Tôi",
                })}
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700">
                <p className="text-xl leading-relaxed mb-6">
                  {t("about.story.paragraph1", {
                    defaultValue:
                      "KDBS được thành lập với sứ mệnh kết nối hai nền văn hóa đặc sắc - Hàn Quốc và Đà Nẵng. Chúng tôi tin rằng du lịch không chỉ là việc di chuyển từ nơi này đến nơi khác, mà còn là cơ hội để khám phá, học hỏi và kết nối với những con người và văn hóa mới.",
                  })}
                </p>
                <p className="text-xl leading-relaxed mb-6">
                  {t("about.story.paragraph2", {
                    defaultValue:
                      "Với đội ngũ chuyên nghiệp và giàu kinh nghiệm, chúng tôi cam kết mang đến những trải nghiệm du lịch đáng nhớ, từ những tour du lịch được thiết kế cẩn thận đến dịch vụ chăm sóc khách hàng tận tâm. Mỗi chuyến đi là một câu chuyện, và chúng tôi muốn câu chuyện của bạn trở nên đặc biệt.",
                  })}
                </p>
                <p className="text-xl leading-relaxed">
                  {t("about.story.paragraph3", {
                    defaultValue:
                      "Hãy cùng chúng tôi khám phá những điều tuyệt vời mà du lịch mang lại!",
                  })}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
