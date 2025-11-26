import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  CalendarClock,
  Sparkles,
  Send,
  Instagram,
  Youtube,
  MessageSquare,
  ArrowRight
} from 'lucide-react';

const Contact = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: '',
    message: ''
  });

  const contactChannels = [
    {
      icon: Phone,
      label: t('contactPage.channels.phoneLabel', { defaultValue: 'Studio Line' }),
      value: '+84 236 888 6868',
      hint: t('contactPage.channels.phoneHint', { defaultValue: '09:00 – 21:00 (GMT+7)' }),
      action: 'tel:+842368886868'
    },
    {
      icon: Mail,
      label: 'Email',
      value: 'softcare@kdbs.vn',
      hint: t('contactPage.channels.mailHint', { defaultValue: 'Reply within 12 hours' }),
      action: 'mailto:softcare@kdbs.vn'
    },
    {
      icon: MessageCircle,
      label: t('contactPage.channels.chatLabel', { defaultValue: 'Zalo / Kakao' }),
      value: '@KDBS-softstudio',
      hint: t('contactPage.channels.chatHint', { defaultValue: 'Instant pastel support' }),
      action: 'https://zalo.me/kdbs'
    }
  ];

  const officeDetails = [
    {
      icon: CalendarClock,
      title: t('contactPage.office.hoursTitle', { defaultValue: 'Calm Office Hours' }),
      content: t('contactPage.office.hoursValue', { defaultValue: 'Mon – Sat · 08:30 – 19:30' })
    },
    {
      icon: MapPin,
      title: t('contactPage.office.addressTitle', { defaultValue: 'Studio Address' }),
      content: '22 Pasteur, Hải Châu, Đà Nẵng'
    }
  ];

  const moments = [
    t('contactPage.moments.one', { defaultValue: 'Thiết kế lịch trình mềm mại cho đoàn Hàn' }),
    t('contactPage.moments.two', { defaultValue: 'Tư vấn thủ tục visa & thanh toán Toss/VNPay' }),
    t('contactPage.moments.three', { defaultValue: 'Kích hoạt đội chăm sóc cảm xúc tại Đà Nẵng' })
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const subject = encodeURIComponent(`[Contact] ${formData.topic || 'Soft inquiry'} – ${formData.name}`);
    const body = encodeURIComponent(`${formData.message}\n\n${formData.name}\n${formData.email}`);
    window.location.href = `mailto:softcare@kdbs.vn?subject=${subject}&body=${body}`;
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#fefefe] via-[#f8f6ff] to-[#f3fbff]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 left-8 w-80 h-80 bg-[#e2f5ff] opacity-70 blur-[120px]" />
        <div className="absolute top-16 right-0 w-72 h-72 bg-[#ffeef3] opacity-60 blur-[120px]" />
        <div className="absolute bottom-5 left-16 w-96 h-96 bg-[#fff5e7] opacity-70 blur-[120px]" />
      </div>

      <div className="relative z-10 px-6 pb-24 pt-20">
        <div className="mx-auto max-w-6xl space-y-16">
          <section className="text-center space-y-6">
            <div className="inline-flex items-center gap-3 rounded-[28px] border border-white/60 bg-white/70 px-6 py-2 text-sm text-gray-600 shadow-[0_15px_45px_rgba(168,168,198,0.25)] backdrop-blur">
              <Sparkles className="h-4 w-4 text-[#9a8cff]" />
              {t('contactPage.hero.badge', { defaultValue: 'Minimal Soft Korean Contact' })}
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gray-900 leading-tight">
                {t('contactPage.hero.title', { defaultValue: 'Chúng tôi lắng nghe mọi nhịp cảm xúc của bạn' })}
              </h1>
              <p className="mx-auto max-w-3xl text-lg md:text-xl text-gray-600 leading-relaxed">
                {t('contactPage.hero.subtitle', {
                  defaultValue: 'Kết nối với studio theo phong cách tối giản, pastel, bo góc mềm mại – để mỗi hành trình Hàn Quốc × Đà Nẵng được chăm sóc tinh tế.'
                })}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {moments.map((moment) => (
                <span
                  key={moment}
                  className="rounded-[999px] border border-white/70 bg-white/80 px-4 py-2 text-sm text-gray-600 shadow-[0_10px_35px_rgba(150,150,220,0.25)] backdrop-blur"
                >
                  {moment}
                </span>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-[0_40px_120px_rgba(158,162,193,0.25)] backdrop-blur">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
                {t('contactPage.form.title', { defaultValue: 'Gửi lời nhắn pastel' })}
              </h2>
              <p className="text-gray-600 mb-8">
                {t('contactPage.form.subtitle', { defaultValue: 'Chúng tôi phản hồi nhẹ nhàng trong vòng 12 giờ, với đề xuất phù hợp vibe của bạn.' })}
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">
                      {t('contactPage.form.name', { defaultValue: 'Họ và tên' })}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full rounded-[20px] border border-white/70 bg-white/70 px-4 py-3 text-gray-900 shadow-inner focus:border-[#9a8cff] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">
                      {t('contactPage.form.email', { defaultValue: 'Email liên hệ' })}
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full rounded-[20px] border border-white/70 bg-white/70 px-4 py-3 text-gray-900 shadow-inner focus:border-[#9a8cff] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">
                    {t('contactPage.form.topic', { defaultValue: 'Chủ đề nhẹ nhàng' })}
                  </label>
                  <input
                    type="text"
                    name="topic"
                    value={formData.topic}
                    onChange={handleChange}
                    placeholder={t('contactPage.form.topicPlaceholder', { defaultValue: 'Ví dụ: Tour 4N3Đ cho khách Hàn' })}
                    className="w-full rounded-[20px] border border-white/70 bg-white/70 px-4 py-3 text-gray-900 shadow-inner focus:border-[#9a8cff] focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">
                    {t('contactPage.form.message', { defaultValue: 'Lời nhắn' })}
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full rounded-[24px] border border-white/70 bg-white/70 px-4 py-3 text-gray-900 shadow-inner focus:border-[#9a8cff] focus:outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="group inline-flex items-center justify-center gap-3 rounded-[26px] border border-transparent bg-gradient-to-r from-[#9a8cff] to-[#7dd3fc] px-6 py-3 text-white font-semibold shadow-[0_25px_60px_rgba(138,161,255,0.35)] transition-all hover:shadow-[0_30px_80px_rgba(138,161,255,0.5)]"
                >
                  <Send className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                  {t('contactPage.form.cta', { defaultValue: 'Gửi lời nhắn' })}
                </button>
              </form>
            </div>
            <div className="space-y-6">
              {contactChannels.map((channel) => (
                <a
                  key={channel.label}
                  href={channel.action}
                  className="block rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_30px_100px_rgba(158,162,193,0.25)] transition-transform hover:-translate-y-1"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-[20px] bg-gradient-to-br from-[#ecf5ff] via-[#fff7fb] to-[#f6f9ff] p-4 text-gray-700">
                      <channel.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.4em] text-gray-500">{channel.label}</p>
                      <p className="text-2xl font-semibold text-gray-900">{channel.value}</p>
                      <p className="text-sm text-gray-500">{channel.hint}</p>
                    </div>
                  </div>
                </a>
              ))}
              <div className="rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-[0_20px_60px_rgba(150,160,190,0.25)]">
                <p className="text-sm uppercase tracking-[0.4em] text-gray-500 mb-3">
                  {t('contactPage.social.badge', { defaultValue: 'Social pastel' })}
                </p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { icon: Instagram, label: 'Instagram', link: 'https://instagram.com/kdbs.pastel' },
                    { icon: Youtube, label: 'YouTube', link: 'https://youtube.com/@kdbs' },
                    { icon: MessageSquare, label: 'KakaoTalk', link: 'https://open.kakao.com/o/kdbs' }
                  ].map((social) => (
                    <a
                      key={social.label}
                      href={social.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-[22px] border border-white/70 bg-white/80 px-4 py-2 text-sm text-gray-600 shadow-inner transition-transform hover:-translate-y-0.5"
                    >
                      <social.icon className="h-4 w-4" />
                      {social.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            {officeDetails.map((detail) => (
              <div
                key={detail.title}
                className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_30px_80px_rgba(157,168,199,0.2)] transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-[20px] bg-white/90 p-4 shadow-inner">
                    <detail.icon className="h-6 w-6 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.4em] text-gray-500">{detail.title}</p>
                    <p className="text-lg font-semibold text-gray-900">{detail.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-[32px] border border-white/60 bg-white/80 p-8 shadow-[0_40px_120px_rgba(157,168,199,0.25)]">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                  {t('contactPage.visit.badge', { defaultValue: 'Visit studio' })}
                </p>
                <h3 className="text-3xl font-semibold text-gray-900">
                  {t('contactPage.visit.title', { defaultValue: 'Đặt lịch hẹn riêng với studio' })}
                </h3>
                <p className="text-gray-600">
                  {t('contactPage.visit.subtitle', { defaultValue: 'Không gian pastel ấm áp với trà thảo mộc, bảng mood Korean và bàn điều phối booking toả sáng.' })}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://maps.app.goo.gl/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-[24px] border border-gray-200 bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-inner"
                  >
                    <MapPin className="h-4 w-4" />
                    {t('contactPage.visit.map', { defaultValue: 'Xem bản đồ' })}
                  </a>
                  <button
                    onClick={() => window.open('https://calendly.com/kdbs-soft', '_blank', 'noopener')}
                    className="group inline-flex items-center gap-2 rounded-[24px] border border-transparent bg-gray-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg"
                  >
                    <CalendarClock className="h-4 w-4" />
                    {t('contactPage.visit.schedule', { defaultValue: 'Đặt lịch pastel' })}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-[#ecf5ff] via-[#fff7fb] to-[#f6f9ff] p-6 shadow-[0_30px_90px_rgba(140,150,200,0.25)]">
                <div className="space-y-4">
                  <div className="rounded-[24px] bg-white/80 p-5 shadow-inner">
                    <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                      {t('contactPage.visit.zenTitle', { defaultValue: 'Zen checklist' })}
                    </p>
                    <ul className="mt-3 space-y-2 text-gray-600">
                      <li>– {t('contactPage.visit.zenOne', { defaultValue: 'Sound healing playlist 528Hz' })}</li>
                      <li>– {t('contactPage.visit.zenTwo', { defaultValue: 'Tea pairing theo mùa' })}</li>
                      <li>– {t('contactPage.visit.zenThree', { defaultValue: 'Mẫu itinerary bo góc 32px' })}</li>
                    </ul>
                  </div>
                  <div className="rounded-[24px] bg-white/80 p-5 shadow-inner">
                    <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                      {t('contactPage.visit.flowTitle', { defaultValue: 'Flow' })}
                    </p>
                    <p className="text-gray-600">
                      {t('contactPage.visit.flowCopy', { defaultValue: '15 phút lắng nghe, 20 phút phối hợp vibe, 5 phút chốt hành trình.' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Contact;

