import React, { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Topbar } from "@/components/Topbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Phone, Clock, AlertCircle, MapPin, Navigation } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { STORE_LOCATIONS } from "@/constants/store";

export default function Locations() {
  const [selectedLocation, setSelectedLocation] = useState(STORE_LOCATIONS[0] as any);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <MapPin className="text-4xl text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              فروعنا
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
تعرف علي اماكن وجودنا          </p>
        </motion.div>



        {/* Locations Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Locations List */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {STORE_LOCATIONS.map((location, index) => (
              <Card 
                key={location.id} 
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedLocation.id === location.id 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedLocation(location)}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${
                        selectedLocation.id === location.id 
                          ? 'bg-primary text-white' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        <Building className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                          {location.name}
                        </h3>
                        <p className="text-gray-600 leading-relaxed mb-3">
                          {location.address}
                        </p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">الهاتف</p>
                          <a
                            href={`tel:${location.phone}`}
                            className="text-green-600 hover:text-green-700 font-semibold"
                          >
                            {location.phone}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">ساعات العمل</p>
                          <p className="text-blue-600 font-semibold">{location.hours}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${location.phone}`, '_self');
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        اتصل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://wa.me/${location.phone}?text=مرحباً، أريد الاستفسار عن المنتجات المتاحة`, '_blank');
                        }}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        واتساب
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Map Section */}
          <motion.div 
            className="h-[500px] lg:h-[600px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                <div className="h-full rounded-lg overflow-hidden">
                  <iframe
                    src={selectedLocation.googleMapsUrl}
                    title={`موقع ${selectedLocation.name}`}
                    className="w-full h-full"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

      </div>

      <Footer />
    </div>
  );
}
