import fs from 'fs';

const IMGBB_API_KEY = "2aba9a2d9e2c6697a33aeda64dc26122";

async function uploadToImgbb(imageUrl) {
  const formData = new URLSearchParams();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", imageUrl);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (data.success) {
    return data.data.url;
  } else {
    throw new Error(data.error.message);
  }
}

const unsplashUrls = [
  "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80", // Paris
  "https://images.unsplash.com/photo-1522083165195-3444ced942ce?w=800&q=80", // Bali
  "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80", // Taj Mahal
  "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80", // Sydney
  "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80", // London
  "https://images.unsplash.com/photo-1473625247510-8ceb1760943f?w=800&q=80", // Spain
  "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80", // Venice
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80", // Tokyo
  "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80", // SF
  "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800&q=80", // Maldives
];

async function run() {
  const finalUrls = [];
  for (const url of unsplashUrls) {
    try {
      console.log("Uploading...", url);
      const resUrl = await uploadToImgbb(url);
      finalUrls.push(resUrl);
    } catch (e) {
      console.log("Failed", e.message);
    }
  }
  fs.writeFileSync("urls.json", JSON.stringify(finalUrls, null, 2));
  console.log("Done!");
}

run();
