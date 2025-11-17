import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import 'bootstrap/dist/css/bootstrap.min.css';
import ProgressBar from 'react-bootstrap/ProgressBar';
import {
  SparklesIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

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

  const missionData = {
    title: t('about.mission.title', { defaultValue: 'Hệ Điều Hành Đặt Tour' }),
    description: t('about.mission.description', {
      defaultValue:
        'Chúng tôi xây dựng nền tảng quản lý tour song ngữ Hàn - Việt giúp doanh nghiệp tại Đà Nẵng vận hành booking, điều phối đối tác và chăm sóc khách Hàn một cách trực quan, công nghệ và theo chuẩn tối giản mềm mại.'
    })
  };

  const heroHighlights = [
    t('about.hero.highlight1', { defaultValue: 'Booking Hub realtime' }),
    t('about.hero.highlight2', { defaultValue: 'Tour workflow cho Đà Nẵng' }),
    t('about.hero.highlight3', { defaultValue: 'Dashboard tiếng Hàn hoàn chỉnh' })
  ];

  const heroInfoChips = [
    {
      label: t('about.hero.since.label', { defaultValue: 'Since' }),
      value: t('about.hero.since.value', { defaultValue: '2018' })
    },
    {
      label: t('about.hero.focus.label', { defaultValue: 'Focus' }),
      value: t('about.hero.focus.value', { defaultValue: 'Booking Ops' })
    }
  ];

  const values = [
    {
      icon: SparklesIcon,
      accent: 'from-[#fce8ff] to-[#e6f6ff]',
      title: t('about.values.quality.title', { defaultValue: 'Booking OS' }),
      description: t('about.values.quality.desc', { defaultValue: 'Điều phối đặt tour, voucher, tình trạng thanh toán trên một mặt phẳng pastel.' })
    },
    {
      icon: ShieldCheckIcon,
      accent: 'from-[#f3f6ff] to-[#e9fff7]',
      title: t('about.values.trust.title', { defaultValue: 'Compliance Center' }),
      description: t('about.values.trust.desc', { defaultValue: 'Theo dõi visa, hợp đồng, SLA đối tác Hàn với cảnh báo realtime.' })
    },
    {
      icon: GlobeAltIcon,
      accent: 'from-[#fff4ec] to-[#f0f5ff]',
      title: t('about.values.excellence.title', { defaultValue: 'Seoul × Đà Nẵng Link' }),
      description: t('about.values.excellence.desc', { defaultValue: 'Đồng bộ đối tác Hàn, nhà cung ứng địa phương và lịch trình đa ngôn ngữ.' })
    },
    {
      icon: HeartIcon,
      accent: 'from-[#ffeef3] to-[#f8f7ff]',
      title: t('about.values.passion.title', { defaultValue: 'Care Automation' }),
      description: t('about.values.passion.desc', { defaultValue: 'Playbook chăm sóc khách Hàn, lịch follow-up và nhắc nhớ trải nghiệm.' })
    }
  ];

  const teamMembers = [
    {
      name: t('about.team.member1.name', { defaultValue: 'Nguyễn Văn A' }),
      role: t('about.team.member1.role', { defaultValue: 'CEO & Founder' }),
      description: t('about.team.member1.desc', { defaultValue: '10+ năm kiến tạo sản phẩm du lịch song văn hóa.' })
    },
    {
      name: t('about.team.member2.name', { defaultValue: 'Trần Thị B' }),
      role: t('about.team.member2.role', { defaultValue: 'Creative Director' }),
      description: t('about.team.member2.desc', { defaultValue: 'Định hình trải nghiệm thị giác và xúc cảm mềm mại.' })
    },
    {
      name: t('about.team.member3.name', { defaultValue: 'Lê Văn C' }),
      role: t('about.team.member3.role', { defaultValue: 'Experience Lead' }),
      description: t('about.team.member3.desc', { defaultValue: 'Chuẩn hóa quy trình chăm sóc khách cân bằng - tinh gọn.' })
    }
  ];

  const stats = [
    { number: '42,380', suffix: '+', label: t('about.stats.customers', { defaultValue: 'Bookings processed' }) },
    { number: '92', suffix: '%', label: t('about.stats.tours', { defaultValue: 'Automation coverage' }) },
    { number: '2.1', suffix: 'x', label: t('about.stats.satisfaction', { defaultValue: 'Faster lead-to-tour' }) },
    { number: '38', suffix: '+', label: t('about.stats.partners', { defaultValue: 'Korean partners' }) }
  ];

  const timelineSteps = [
    {
      year: '2018',
      title: t('about.timeline.start.title', { defaultValue: 'Khởi đầu từ Seoul' }),
      description: t('about.timeline.start.desc', {
        defaultValue: 'Kết nối những chuyên gia Hàn Quốc đầu tiên với cộng đồng yêu Đà Nẵng.'
      })
    },
    {
      year: '2020',
      title: t('about.timeline.expand.title', { defaultValue: 'Bản sắc tối giản' }),
      description: t('about.timeline.expand.desc', {
        defaultValue: 'Ứng dụng nghệ thuật sống Hàn để tái thiết kế tour chăm sóc cảm xúc.'
      })
    },
    {
      year: '2023',
      title: t('about.timeline.partnership.title', { defaultValue: 'Đối tác chuẩn quốc tế' }),
      description: t('about.timeline.partnership.desc', {
        defaultValue: 'Hợp tác với chuỗi lưu trú, spa công nghệ cao cho hành trình thư giãn.'
      })
    },
    {
      year: '2025',
      title: t('about.timeline.future.title', { defaultValue: 'Studio trải nghiệm' }),
      description: t('about.timeline.future.desc', {
        defaultValue: 'Ra mắt studio cảm hứng Hàn tại Đà Nẵng với công nghệ tương tác.'
      })
    }
  ];

  const automationMonitor = [
    { label: t('about.monitor.booking', { defaultValue: 'Booking load' }), value: 78, tone: '#c7d8ff' },
    { label: t('about.monitor.operations', { defaultValue: 'Ops readiness' }), value: 64, tone: '#ffe1ef' },
    { label: t('about.monitor.experience', { defaultValue: 'Experience score' }), value: 91, tone: '#d6f7ff' }
  ];

  const controlMetrics = [
    {
      title: t('about.metrics.korAgents', { defaultValue: 'Korean Agents Online' }),
      value: '38',
      change: '+12%',
      caption: t('about.metrics.korAgents.caption', { defaultValue: 'Seoul & Busan partners' })
    },
    {
      title: t('about.metrics.vnOperators', { defaultValue: 'Da Nang Operators' }),
      value: '24',
      change: '+4%',
      caption: t('about.metrics.vnOperators.caption', { defaultValue: 'Tour logistics & chauffeur' })
    },
    {
      title: t('about.metrics.sla', { defaultValue: 'SLA Stability' }),
      value: '99.2%',
      change: '+0.4%',
      caption: t('about.metrics.sla.caption', { defaultValue: 'Realtime monitoring' })
    }
  ];

  const workflow = [
    {
      title: t('about.workflow.capture', { defaultValue: 'Capture & qualify lead' }),
      detail: t('about.workflow.capture.detail', { defaultValue: 'Zalo, KakaoTalk, web booking form đồng bộ về CRM Hàn - Việt.' })
    },
    {
      title: t('about.workflow.design', { defaultValue: 'Thiết kế hành trình' }),
      detail: t('about.workflow.design.detail', { defaultValue: 'Chọn tour mẫu, áp dụng voucher, tính giá KRW ↔︎ VND tức thời.' })
    },
    {
      title: t('about.workflow.coordinate', { defaultValue: 'Điều phối nhà cung ứng' }),
      detail: t('about.workflow.coordinate.detail', { defaultValue: 'Push alert đến khách sạn, xe, HDV với checklist hai ngôn ngữ.' })
    },
    {
      title: t('about.workflow.care', { defaultValue: 'Care & báo cáo' }),
      detail: t('about.workflow.care.detail', { defaultValue: 'Theo dõi cảm xúc khách Hàn, tự động phát hành báo cáo cho đối tác.' })
    }
  ];

  const integrationBadges = [
    'Kakao Business API',
    'Naver / Google Calendar',
    'VNPay & Toss Payments',
    'Zalo OA',
    'AirTable Sync',
    'GSAP Micro Animations'
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animation
      const heroTl = gsap.timeline();
      heroTl
        .from(titleRef.current, {
          y: 100,
          opacity: 0,
          duration: 1,
          ease: 'power4.out'
        })
        .from(subtitleRef.current, {
          y: 50,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out'
        }, '-=0.5');

      // Mission section animation
      gsap.from(missionRef.current?.children || [], {
        scrollTrigger: {
          trigger: missionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
      });

      // Values cards animation
      if (valuesRef.current) {
        gsap.from(valuesRef.current.children, {
          scrollTrigger: {
            trigger: valuesRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          },
          scale: 0.8,
          opacity: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: 'back.out(1.7)'
        });
      }

      // Team members animation
      if (teamRef.current) {
        gsap.from(teamRef.current.children, {
          scrollTrigger: {
            trigger: teamRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          },
          y: 80,
          opacity: 0,
          rotationX: -15,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out'
        });
      }

      // Stats counter animation
      if (statsRef.current) {
        const statElements = Array.from(statsRef.current.querySelectorAll('.stat-card'));
        statElements.forEach((stat, index) => {
          const numberElement = stat.querySelector('.stat-number');
          if (!numberElement) return;

          const rawNumber = numberElement.dataset.number || '0';
          const suffix = numberElement.dataset.suffix || '';
          const numericValue = parseFloat(rawNumber.replace(/[^0-9.]/g, '')) || 0;
          const hasDecimal = rawNumber.includes('.');
          const suffixIsPercent = suffix.includes('%');
          const suffixHasPlus = suffix.includes('+');
          const suffixIsMultiplier = suffix.includes('x');

          const counter = { value: 0 };

          gsap.from(stat, {
            scrollTrigger: {
              trigger: stat,
              start: 'top 90%',
              toggleActions: 'play none none none'
            },
            scale: 0,
            opacity: 0,
            duration: 0.5,
            delay: index * 0.1,
            ease: 'back.out(1.7)',
            onComplete: () => {
              gsap.to(counter, {
                value: numericValue,
                duration: 2,
                ease: 'power2.out',
                onUpdate: function() {
                  let displayValue;
                  if (suffixIsPercent) {
                    displayValue = `${Math.round(counter.value)}%`;
                  } else if (suffixHasPlus) {
                    displayValue = `${Math.round(counter.value).toLocaleString()}+`;
                  } else if (suffixIsMultiplier) {
                    displayValue = `${counter.value.toFixed(1)}x`;
                  } else if (hasDecimal) {
                    displayValue = counter.value.toFixed(1);
                  } else {
                    displayValue = Math.round(counter.value).toLocaleString();
                  }
                  numberElement.textContent = displayValue;
                }
              });
            }
          });
        });
      }

      // Parallax effect for hero
      gsap.to(heroRef.current, {
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1
        },
        y: 100,
        opacity: 0.3
      });

    }, timelineRef);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#fefefe] via-[#f8f6ff] to-[#f3fbff]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-6 w-80 h-80 bg-[#fce8ff] opacity-60 blur-[120px]" />
        <div className="absolute top-10 left-0 w-96 h-96 bg-[#e3f6ff] opacity-60 blur-[120px]" />
        <div className="absolute bottom-8 right-16 w-72 h-72 bg-[#fff3e6] opacity-60 blur-[120px]" />
      </div>
      <div ref={timelineRef} className="relative z-10">
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative min-h-[75vh] px-6 py-24 flex items-center"
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid lg:grid-cols-2 gap-14 items-center">
              <div className="space-y-8">
                <div className="inline-flex flex-wrap gap-2">
                  {heroHighlights.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-[999px] border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-gray-600 shadow-[0_10px_40px_rgba(149,149,255,0.25)] backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.04]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <div>
                  <h1
                    ref={titleRef}
                    className="text-5xl md:text-6xl xl:text-7xl font-semibold text-gray-900 leading-tight tracking-tight"
                  >
                    {t('about.hero.title', { defaultValue: 'Tour Management Studio cho Hàn Quốc × Đà Nẵng' })}
                  </h1>
                  <p
                    ref={subtitleRef}
                    className="mt-6 text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl"
                  >
                    {t('about.hero.subtitle', {
                      defaultValue:
                        'Một nền tảng pastel giúp đội ngũ điều phối booking, kiểm soát tour, thanh toán và chăm sóc khách Hàn ngay tại Đà Nẵng – trực quan, tối giản nhưng giàu công nghệ.'
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {heroInfoChips.map((chip) => (
                    <div
                      key={chip.label}
                      className="w-48 md:w-56 text-center rounded-[28px] border border-white/60 px-6 py-4 backdrop-blur-sm bg-transparent shadow-none transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.03]"
                    >
                      <p className="text-xs uppercase tracking-[0.4em] text-gray-500">{chip.label}</p>
                      <p className="text-2xl md:text-3xl font-semibold text-gray-900">{chip.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[32px] bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_40px_120px_rgba(129,141,193,0.25)] p-8 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01]">
                  <div className="rounded-[28px] bg-gradient-to-br from-[#ecf5ff] via-[#fff7fb] to-[#f6f9ff] p-6 space-y-6 transition-transform duration-300 hover:scale-[1.01]">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-white/90 p-4 shadow-inner transition-transform duration-300 hover:scale-110">
                        <SparklesIcon className="w-8 h-8 text-[#9a8cff]" />
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Control Hub</p>
                        <p className="text-2xl font-semibold text-gray-900">Booking + Ops Cloud</p>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-white/80 bg-white/60 p-5 space-y-4 transition-transform duration-300 hover:scale-[1.02]">
                      <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Realtime routing</p>
                      <div className="flex items-center justify-between text-gray-900">
                        <span className="text-3xl font-semibold">Seoul</span>
                        <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
                        <span className="text-3xl font-semibold">Đà Nẵng</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="rounded-[22px] bg-white/70 p-4 transition-transform duration-300 hover:scale-[1.02]">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Automation</p>
                        <p className="text-lg font-semibold text-gray-900">92% tasks</p>
                      </div>
                      <div className="rounded-[22px] bg-white/70 p-4 transition-transform duration-300 hover:scale-[1.02]">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Coverage</p>
                        <p className="text-lg font-semibold text-gray-900">KOR ↔︎ VN</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-6 -right-6 rounded-[24px] bg-white px-4 py-3 shadow-xl border border-white/70 transition-transform duration-300 hover:-translate-y-0.5 hover:scale-105">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Live</p>
                  <p className="text-lg font-semibold text-gray-900">Ops radar v3.1</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Control Center */}
        <section className="px-6 mt-6 pb-4">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
            <div className="rounded-[32px] bg-white/90 border border-white/70 shadow-[0_25px_90px_rgba(154,168,199,0.25)] p-8 space-y-6 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01]">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Live control</p>
                <h3 className="text-3xl font-semibold text-gray-900">
                  {t('about.control.korvn', { defaultValue: 'Korean × Đà Nẵng workforce' })}
                </h3>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {controlMetrics.map((metric) => (
                  <div
                    key={metric.title}
                    className="rounded-[22px] bg-gradient-to-br from-white to-[#f6f8ff] border border-white/70 p-4 transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{metric.title}</p>
                    <p className="text-3xl font-semibold text-gray-900 mt-2">{metric.value}</p>
                    <p className="text-sm text-emerald-500 font-medium">{metric.change}</p>
                    <p className="text-xs text-gray-500 mt-1">{metric.caption}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] bg-white/90 border border-white/70 shadow-[0_25px_90px_rgba(154,168,199,0.25)] p-8 space-y-6 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01]">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Automation pulse</p>
                <h3 className="text-3xl font-semibold text-gray-900">
                  {t('about.control.monitor', { defaultValue: 'Trạng thái điều hành realtime' })}
                </h3>
              </div>
              <div className="space-y-5">
                {automationMonitor.map((metric) => (
                  <div key={metric.label}>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{metric.label}</span>
                      <span className="font-semibold text-gray-900">{metric.value}%</span>
                    </div>
                    <ProgressBar
                      now={metric.value}
                      className="rounded-pill overflow-hidden"
                      style={{
                        height: '10px',
                        backgroundColor: 'rgba(255,255,255,0.6)',
                        '--bs-progress-bar-bg': metric.tone
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section ref={missionRef} className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-[32px] bg-white/90 shadow-[0_30px_120px_rgba(159,168,195,0.25)] border border-white/70 px-10 py-12 md:px-14 md:py-16 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01]">
              <div className="flex flex-col items-center gap-6 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-500">
                  <SparklesIcon className="w-4 h-4" />
                  {t('about.mission.badge', { defaultValue: 'Sứ mệnh mềm mại' })}
                </span>
                <h2 className="text-4xl md:text-5xl font-semibold text-gray-900">
                  {missionData.title}
                </h2>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl">
                  {missionData.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section ref={statsRef} className="py-16 px-6">
          <div className="max-w-6xl mx-auto rounded-[32px] bg-white/70 border border-white/60 px-8 py-12 backdrop-blur-xl shadow-[0_30px_100px_rgba(157,168,199,0.25)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="stat-card transform rounded-[28px] border border-gray-100 bg-white/90 p-6 text-center shadow-inner transition duration-400 ease-out hover:-translate-y-1 hover:scale-[1.05] hover:shadow-2xl"
                >
                  <div
                    className="stat-number text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight mb-2"
                    data-number={stat.number}
                    data-suffix={stat.suffix || ''}
                  >
                    {stat.number}
                    {stat.suffix}
                  </div>
                  <div className="text-sm uppercase tracking-[0.35em] text-gray-500">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section ref={valuesRef} className="py-16 px-6">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <p className="text-sm uppercase tracking-[0.5em] text-gray-500">
                {t('about.values.badge', { defaultValue: 'Core values' })}
              </p>
              <h2 className="text-4xl md:text-5xl font-semibold text-gray-900">
                {t('about.values.title', { defaultValue: 'Giá Trị Cốt Lõi' })}
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                {t('about.values.subtitle', {
                  defaultValue: 'Định hình trải nghiệm mềm mại với icon mảnh, gam pastel và bố cục thoáng đãng.'
                })}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <div
                  key={value.title}
                  className="rounded-[28px] bg-white/80 border border-white/70 shadow-[0_20px_80px_rgba(149,149,179,0.2)] p-6 space-y-4 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(149,149,179,0.35)]"
                >
                  <div className={`rounded-[20px] bg-gradient-to-br ${value.accent} p-4 inline-flex`}>
                    <value.icon className="w-8 h-8 text-gray-700" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto rounded-[32px] bg-white/85 border border-white/70 px-10 py-12 shadow-[0_40px_120px_rgba(158,162,193,0.25)]">
            <div className="flex items-center gap-3 mb-10">
              <div className="rounded-full bg-gray-900/90 text-white px-5 py-2 text-xs tracking-[0.4em] uppercase">
                {t('about.workflow.badge', { defaultValue: 'Workflow' })}
              </div>
              <p className="text-gray-500 text-sm">
                {t('about.workflow.caption', { defaultValue: 'Chu trình vận hành tour Hàn - Đà Nẵng' })}
              </p>
            </div>
            <div className="space-y-6">
              {workflow.map((step, idx) => (
                <div
                  key={step.title}
                  className="flex flex-col sm:flex-row sm:items-center gap-6 rounded-[28px] border border-gray-100 bg-white/90 px-6 py-5 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg"
                >
                  <div className="text-sm uppercase tracking-[0.4em] text-gray-500">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="sm:h-16 sm:w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent hidden sm:block" />
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{step.title}</p>
                    <p className="text-gray-600">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto rounded-[32px] bg-white/85 border border-white/70 px-10 py-12 shadow-[0_40px_120px_rgba(158,162,193,0.25)]">
            <div className="flex items-center gap-3 mb-10">
              <div className="rounded-full bg-gray-900/90 text-white px-5 py-2 text-xs tracking-[0.4em] uppercase">
                {t('about.timeline.badge', { defaultValue: 'Journey' })}
              </div>
              <p className="text-gray-500 text-sm">
                {t('about.timeline.caption', { defaultValue: 'Minimal Soft Korean timeline' })}
              </p>
            </div>
            <div className="space-y-6">
              {timelineSteps.map((step, idx) => (
                <div
                  key={step.year}
                  className="flex flex-col sm:flex-row sm:items-center gap-6 rounded-[28px] border border-gray-100 bg-white/90 px-6 py-5 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg"
                >
                  <div className="text-4xl font-semibold text-gray-900">{step.year}</div>
                  <div className="sm:h-16 sm:w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent hidden sm:block" />
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-gray-900">{step.title}</p>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto rounded-[32px] bg-white/80 border border-white/70 px-8 py-10 shadow-[0_30px_100px_rgba(157,168,199,0.25)]">
            <div className="text-center mb-8">
              <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                {t('about.integrations.badge', { defaultValue: 'Connected stack' })}
              </p>
              <h3 className="text-3xl font-semibold text-gray-900 mt-2">
                {t('about.integrations.title', { defaultValue: 'Thư viện công nghệ chúng tôi sử dụng' })}
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {integrationBadges.map((badge) => (
                <div
                  key={badge}
                  className="rounded-[24px] border border-gray-100 bg-white/90 px-4 py-3 text-center text-sm font-semibold text-gray-700 shadow-inner"
                >
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section ref={teamRef} className="py-16 px-6">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                {t('about.team.badge', { defaultValue: 'Human touch' })}
              </p>
              <h2 className="text-4xl md:text-5xl font-semibold text-gray-900">
                {t('about.team.title', { defaultValue: 'Đội Ngũ Vibe Studio' })}
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <div
                  key={member.name}
                  className="rounded-[28px] border border-white/70 bg-white/80 shadow-[0_25px_80px_rgba(174,174,204,0.25)] p-8 text-center space-y-4 transition duration-300 hover:-translate-y-1"
                >
                  <div className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-[#e5f5ff] via-white to-[#fff1f7] flex items-center justify-center text-4xl font-semibold text-gray-900 border border-white/60">
                    {member.name.charAt(0)}
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-sm uppercase tracking-[0.4em] text-gray-500">{member.role}</p>
                  <p className="text-gray-600">{member.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto rounded-[32px] bg-white/90 border border-white/60 px-10 py-14 shadow-[0_40px_120px_rgba(157,168,199,0.25)]">
            <div className="flex flex-col gap-8">
              <div>
                <p className="text-sm uppercase tracking-[0.5em] text-gray-500">
                  {t('about.story.badge', { defaultValue: 'Soft narrative' })}
                </p>
                <h2 className="mt-3 text-4xl md:text-5xl font-semibold text-gray-900">
                  {t('about.story.title', { defaultValue: 'Câu Chuyện Mềm Mại' })}
                </h2>
              </div>
              <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
                <p>
                  {t('about.story.paragraph1', {
                    defaultValue:
                      'KDBS sinh ra từ cảm hứng Minimal Soft Korean – nơi nhịp sống chậm, ánh sáng trắng và vật liệu bo góc tạo nên sự an tâm. Mỗi tour được biên tập như một bản hòa âm với nhịp thở công nghệ và thiên nhiên.'
                  })}
                </p>
                <p>
                  {t('about.story.paragraph2', {
                    defaultValue:
                      'Chúng tôi ưu tiên sức khỏe tinh thần trong từng bước: từ spa hương thảo mộc, thiền thở biển, đến trải nghiệm thực tế mở rộng giúp lưu giữ cảm xúc. Công nghệ chỉ làm nền, cảm xúc của bạn là trung tâm.'
                  })}
                </p>
                <p className="text-gray-500">
                  {t('about.story.paragraph3', {
                    defaultValue:
                      'Hãy để chúng tôi giúp bạn chạm tới phiên bản bình yên nhất của mình giữa lòng Đà Nẵng.'
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