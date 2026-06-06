CITY_RIVERES ={
    "colombo": ["Kelani Ganga"],
    "kelaniya": ["Kelani Ganga"],
    "kaduwela": ["Kelani Ganga"],
    "hanwella": ["Kelani Ganga"],
    "mapitigama": ["Kelani Ganga"],
    "pugoda": ["Kelani Ganga"],
    "ruwanwella": ["Kelani Ganga"],
    "avissawella": ["Kelani Ganga"],
    "wellampitiya": ["Kelani Ganga"],
    "kolonnawa": ["Kelani Ganga"],
    "ratnapura": ["Kalu Ganga"],
    "millakanda": ["Kalu Ganga"],
    "putupaula": ["Kalu Ganga"],
    "kalutara": ["Kalu Ganga"],
    "kuruvita": ["Kuru Ganga"],
    "kuruwita": ["Kuru Ganga"],
    "ayagama": ["Galathura Oya", "Kalu Ganga"],
    "pelmadulla": ["Denawaka Ganga"],
    "kalawana": ["Kukule Ganga"],
    "kahawaththa": ["Wey Ganga"],
    "kahawatta": ["Wey Ganga"],
    "erathna": ["Kiri Ganga"],
    "elapatha": ["Niriella Ganga", "Kalu Ganga"],
    "matara": ["Nilwala Ganga", "Nilwala"],
    "bangama": ["Nilwala Ganga", "Nilwala"],
    "polothugama": ["Nilwala Ganga", "Nilwala"],
    "hulandawa": ["Nilwala Ganga", "Nilwala"],
    "warapitiya": ["Nilwala Ganga", "Nilwala"],
    "kekiriobada": ["Nilwala Ganga", "Nilwala"],
    "peradeniya": ["Mahaweli River"],
    "kandy": ["Mahaweli River"],
    "gampola": ["Mahaweli River"],
    "teldeniya": ["Mahaweli River"],
    "katugastota": ["Mahaweli River"],
    "chilaw": ["Deduru Oya"],
    "kurunegala": ["Deduru Oya"],
    "ridibendiella": ["Deduru Oya"],
    "sengaloya": ["Deduru Oya"],
    "puttalam": ["Mi Oya"],
    "wanathawilluwa": ["Mi Oya"],
    "pahariya": ["Mi Oya"],
    "anuradhapura": ["Malwathu Oya"],
    "vavuniya": ["Malwathu Oya"],
    "rambewa": ["Malwathu Oya"],
    "poonawa": ["Malwathu Oya"],
    "trincomalee": ["Yan Oya"],
    "habarana": ["Yan Oya"],
    "ampara": ["Gal Oya"],
    "batticaloa": ["Mundeni Aru", "Magalawattuwan Oya", "Maduru Oya", "Andella Oya"],
    "gampaha": ["Uruwal Oya", "Kalu Ela"],
    "wattala": ["Kalu Ela"],
    "miriswatta": ["Uruwal Oya"],
    "badulla": ["Hali Ela"]
}

# Ordered list of stations from Upstream (highest elevation) to Downstream (sea level)
RIVER_STATION_ORDER = {
    "Kelani Ganga": ["Holombuwa", "Deraniyagala", "Kithulgala", "Ruwanwella", "Glencourse", "Hanwella", "Nagalagam Street"],
    "Kalu Ganga": ["Ratnapura", "Ellagawa", "Millakanda", "Putupaula"],
    "Nilwala Ganga": ["Bopagoda", "Urawa", "Panadugama", "Pitabeddara", "Thalgahagoda"],
    "Gin Ganga": ["Tawalama", "Baddegama"]
}

def find_rivers(city):
    city = city.lower().strip()
    return CITY_RIVERES.get(city, [])
    
def get_relative_position(basin_name, current_station_name, other_station_name):
    """
    Returns 'Upstream', 'Downstream', or '' based on topological order.
    """
    order = RIVER_STATION_ORDER.get(basin_name, [])
    if not order:
        return ""
        
    curr_idx = -1
    other_idx = -1
    
    for i, s in enumerate(order):
        if s.lower() in current_station_name.lower():
            curr_idx = i
        if s.lower() in other_station_name.lower():
            other_idx = i
            
    if curr_idx != -1 and other_idx != -1:
        if other_idx < curr_idx:
            return "Upstream"
        elif other_idx > curr_idx:
            return "Downstream"
    return ""
