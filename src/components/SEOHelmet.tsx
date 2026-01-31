import { Helmet } from 'react-helmet-async';

interface SEOHelmetProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'product' | 'article';
    productData?: {
        name: string;
        brand?: string;
        price?: number;
        currency?: string;
        availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
        condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
        sku?: string;
    };
}

export const SEOHelmet = ({
    title,
    description,
    keywords,
    image = 'https://elhamds.vercel.app/logo1.png',
    url,
    type = 'website',
    productData,
}: SEOHelmetProps) => {
    const baseUrl = 'https://elhamds.vercel.app';
    const fullUrl = url ? `${baseUrl}${url}` : baseUrl;

    const defaultTitle = 'شركة الحمد للابتوبات | Elhamd Laptops Store - أفضل أسعار اللابتوبات والكمبيوترات في مصر';
    const defaultDescription = 'شركة الحمد للابتوبات - متجر متخصص في بيع اللابتوبات، الكمبيوترات، وجميع أجهزة الهاردوير بأفضل الأسعار. نوفر لابتوب HP، Dell، Lenovo، Asus، Acer، MSI، Apple MacBook وجميع الماركات العالمية. توصيل لجميع المحافظات.';
    const defaultKeywords = 'شركة الحمد للابتوبات, شركة الحمد, Elhamd Store, Elhamd Laptops, لاب توب, لابتوب, كمبيوتر';

    const pageTitle = title ? `${title} | شركة الحمد للابتوبات` : defaultTitle;
    const pageDescription = description || defaultDescription;
    const pageKeywords = keywords || defaultKeywords;

    // Create Product Schema if productData is provided
    const productSchema = productData ? {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": productData.name,
        "image": image,
        "description": pageDescription,
        "sku": productData.sku || '',
        "brand": {
            "@type": "Brand",
            "name": productData.brand || 'Unknown'
        },
        "offers": {
            "@type": "Offer",
            "url": fullUrl,
            "priceCurrency": productData.currency || "EGP",
            "price": productData.price || 0,
            "availability": `https://schema.org/${productData.availability || 'InStock'}`,
            "itemCondition": `https://schema.org/${productData.condition || 'NewCondition'}`,
            "seller": {
                "@type": "Organization",
                "name": "شركة الحمد للابتوبات"
            }
        }
    } : null;

    // Create BreadcrumbList Schema
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "الرئيسية",
                "item": baseUrl
            },
            ...(url && url !== '/' ? [{
                "@type": "ListItem",
                "position": 2,
                "name": title || 'صفحة',
                "item": fullUrl
            }] : [])
        ]
    };

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{pageTitle}</title>
            <meta name="title" content={pageTitle} />
            <meta name="description" content={pageDescription} />
            <meta name="keywords" content={pageKeywords} />

            {/* Canonical URL */}
            <link rel="canonical" href={fullUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content="شركة الحمد للابتوبات" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={fullUrl} />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDescription} />
            <meta name="twitter:image" content={image} />

            {/* Product Schema if available */}
            {productSchema && (
                <script type="application/ld+json">
                    {JSON.stringify(productSchema)}
                </script>
            )}

            {/* Breadcrumb Schema */}
            <script type="application/ld+json">
                {JSON.stringify(breadcrumbSchema)}
            </script>
        </Helmet>
    );
};
