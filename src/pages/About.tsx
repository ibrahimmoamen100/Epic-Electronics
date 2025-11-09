import React from "react";
import { useTranslation } from "react-i18next";
import {
  FaWhatsapp,
  FaLaptop,
  FaShieldAlt,
  FaBatteryFull,
  FaExchangeAlt,
  FaPhone,
  FaStore,
  FaAward,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import Footer from "@/components/Footer";
import { STORE_OWNER } from "@/constants/store";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const warrantyFeatures = [
  {
    icon: FaShieldAlt,
    title: "ضمان شهرين",
    description: "على جميع المنتجات ضد عيوب الصناعة",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    icon: FaBatteryFull,
    title: "ضمان شهر واحد",
    description: "على البطاريات والشواحن والبورات",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    icon: FaExchangeAlt,
    title: "شهر استبدال",
    description: "على جميع المنتجات",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
];

const companyInfo = [
  {
    icon: FaStore,
    title: "شركة الحمد للابتوبات",
    description: "نحن شركة لبيع اللابتوبات الاستيراد بأفضل الأسعار وبأفضل جودة",
    color: "text-primary",
    bgColor: "bg-primary/5",
    borderColor: "border-primary/20",
  },
  {
    icon: FaShieldAlt,
    title: "ضمان شهرين شامل",
    description: "الجهاز عليه شهرين ضمان (شهر صيانة + شهر استبدال) 👌",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
];

export default function About() {
  const { t } = useTranslation();

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("مرحباً، أريد الاستفسار عن المنتجات المتاحة");
    const phoneWithCountryCode = STORE_OWNER.whatsapp;
    window.open(
      `https://wa.me/${phoneWithCountryCode}?text=${message}`,
      "_blank"
    );
  };

  const handlePhoneClick = () => {
    window.open(`tel:${STORE_OWNER.phone}`, "_self");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-primary/10 via-blue-50 to-primary/5 py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="container relative mx-auto px-4">
            <motion.div 
              className="max-w-4xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="mb-2">
                <div className="relative mb-2">
                  <div className="absolute inset-0  rounded-full  scale-110"></div>
                  <div className="relative p-4 rounded-3xl  mx-auto w-fit">
                    <img
                      src="/logo.png"
                      alt="لوجو شركة الحمد للابتوبات"
                      className="w-auto h-32 md:w-auto md:h-48 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  شركة الحمد للابتوبات                </h1>
              </div>
              <p className="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed">
                نحن شركة لبيع اللابتوبات الاستيراد بأفضل الأسعار وبأفضل جودة
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  onClick={handleWhatsAppClick}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <FaWhatsapp className="text-xl mr-2" />
                  تواصل عبر واتساب
                </Button>
                <Button
                  onClick={handlePhoneClick}
                  variant="outline"
                  size="lg"
                  className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <FaPhone className="text-xl mr-2" />
                  {STORE_OWNER.phone}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Company Info Section */}
        <div className="container py-16 mx-auto px-4">
          <motion.div 
            className="grid md:grid-cols-2 gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {companyInfo.map((info, index) => (
              <div
                key={index}
                className={`${info.bgColor} ${info.borderColor} border-2 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-full ${info.bgColor} ${info.borderColor} border-2`}>
                    <info.icon className={`text-3xl ${info.color}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {info.title}
                  </h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {info.description}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Warranty Section */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 py-20">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="flex items-center justify-center gap-3 mb-6">
                <FaAward className="text-4xl text-primary" />
                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  ضماناتنا
                </h2>
              </div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                نقدم ضمانات شاملة على جميع منتجاتنا لضمان رضاكم التام
              </p>
            </motion.div>
            
            <motion.div 
              className="grid md:grid-cols-3 gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {warrantyFeatures.map((feature, index) => (
                <div
                  key={index}
                  className={`${feature.bgColor} ${feature.borderColor} border-2 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-center`}
                >
                  <div className={`inline-flex p-4 rounded-full ${feature.bgColor} ${feature.borderColor} border-2 mb-6`}>
                    <feature.icon className={`text-4xl ${feature.color}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-br from-primary/10 via-blue-50 to-primary/5 py-20">
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="mb-12">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  تواصل معنا
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  نحن هنا لخدمتكم وتقديم أفضل المنتجات بأفضل الأسعار
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-green-200 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="p-3 bg-green-100 rounded-full">
                      <FaWhatsapp className="text-3xl text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">واتساب</h3>
                  </div>
                  <p className="text-lg text-gray-600 mb-6">
                    تواصل معنا عبر واتساب للحصول على استشارة مجانية
                  </p>
                  <Button
                    onClick={handleWhatsAppClick}
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <FaWhatsapp className="text-xl mr-2" />
                    تواصل عبر واتساب
                  </Button>
                </div>
                
                <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-primary/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <FaPhone className="text-3xl text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">اتصال مباشر</h3>
                  </div>
                  <p className="text-lg text-gray-600 mb-6">
                    اتصل بنا مباشرة للحصول على المساعدة الفورية
                  </p>
                  <Button
                    onClick={handlePhoneClick}
                    variant="outline"
                    size="lg"
                    className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-white py-3 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <FaPhone className="text-xl mr-2" />
                    {STORE_OWNER.phone}
                  </Button>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-primary/20">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <FaCheckCircle className="text-2xl text-green-600" />
                  <h3 className="text-2xl font-bold text-gray-800">لماذا تختارنا؟</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div>
                    <h4 className="text-lg font-semibold text-primary mb-2">أفضل الأسعار</h4>
                    <p className="text-gray-600">نقدم أفضل الأسعار في السوق</p>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-primary mb-2">جودة عالية</h4>
                    <p className="text-gray-600">منتجات عالية الجودة ومضمونة</p>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-primary mb-2">ضمان شامل</h4>
                    <p className="text-gray-600">ضمانات شاملة على جميع المنتجات</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
