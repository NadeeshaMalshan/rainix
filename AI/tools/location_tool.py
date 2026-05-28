CITY_RIVERES ={
    "colombo": [
    "Kelani Ganga"
  ],
  "kelaniya": [
    "Kelani Ganga"
  ],
  "kaduwela": [
    "Kelani Ganga"
  ],
  "hanwella": [
    "Kelani Ganga"
  ],
  "mapitigama": [
    "Kelani Ganga"
  ],
  "pugoda": [
    "Kelani Ganga"
  ],
  "ruwanwella": [
    "Kelani Ganga"
  ],
  "avissawella": [
    "Kelani Ganga"
  ],
  "wellampitiya": [
    "Kelani Ganga"
  ],
  "kolonnawa": [
    "Kelani Ganga"
  ],
  "ratnapura": [
    "Kalu Ganga"
  ],
  "millakanda": [
    "Kalu Ganga"
  ],
  "putupaula": [
    "Kalu Ganga"
  ],
  "kalutara": [
    "Kalu Ganga"
  ],
  "kuruvita": [
    "Kuru Ganga"
  ],
  "kuruwita": [
    "Kuru Ganga"
  ],
  "ayagama": [
    "Galathura Oya",
    "Kalu Ganga"
  ],
  "pelmadulla": [
    "Denawaka Ganga"
  ],
  "kalawana": [
    "Kukule Ganga"
  ],
  "kahawaththa": [
    "Wey Ganga"
  ],
  "kahawatta": [
    "Wey Ganga"
  ],
  "erathna": [
    "Kiri Ganga"
  ],
  "elapatha": [
    "Niriella Ganga",
    "Kalu Ganga"
  ],
  "matara": [
    "Nilwala Ganga",
    "Nilwala"
  ],
  "bangama": [
    "Nilwala Ganga",
    "Nilwala"
  ],
  "polothugama": [
    "Nilwala Ganga",
    "Nilwala"
  ],
  "hulandawa": [
    "Nilwala Ganga",
    "Nilwala"
  ],
  "warapitiya": [
    "Nilwala Ganga",
    "Nilwala"
  ],
  "kekiriobada": [
    "Nilwala Ganga",
    "Nilwala"
  ],
  "peradeniya": [
    "Mahaweli River"
  ],
  "kandy": [
    "Mahaweli River"
  ],
  "gampola": [
    "Mahaweli River"
  ],
  "teldeniya": [
    "Mahaweli River"
  ],
  "katugastota": [
    "Mahaweli River"
  ],
  "chilaw": [
    "Deduru Oya"
  ],
  "kurunegala": [
    "Deduru Oya"
  ],
  "ridibendiella": [
    "Deduru Oya"
  ],
  "sengaloya": [
    "Deduru Oya"
  ],
  "puttalam": [
    "Mi Oya"
  ],
  "wanathawilluwa": [
    "Mi Oya"
  ],
  "pahariya": [
    "Mi Oya"
  ],
  "anuradhapura": [
    "Malwathu Oya"
  ],
  "vavuniya": [
    "Malwathu Oya"
  ],
  "rambewa": [
    "Malwathu Oya"
  ],
  "poonawa": [
    "Malwathu Oya"
  ],
  "trincomalee": [
    "Yan Oya"
  ],
  "habarana": [
    "Yan Oya"
  ],
  "ampara": [
    "Gal Oya"
  ],
  "batticaloa": [
    "Mundeni Aru",
    "Magalawattuwan Oya",
    "Maduru Oya",
    "Andella Oya"
  ],
  "gampaha": [
    "Uruwal Oya",
    "Kalu Ela"
  ],
  "wattala": [
    "Kalu Ela"
  ],
  "miriswatta": [
    "Uruwal Oya"
  ],
  "badulla": [
    "Hali Ela"
  ]
}


def find_rivers(city):
    city = city.lower().strip()
    return CITY_RIVERES.get(city, [])
   
