<<<<<<< HEAD
print("=" * 50)
print("      FuElectric-AI 1.0")
print(" AI Equipment Diagnosis System")
print("=" * 50)

environment = input("Select Environment(Home/Office/Factory/School/Hospital):")
equipment = input("Enter Equipment Name:")
equipment_type = input("Enter Equipment Type:")
equipment_id = input("Enter Equipment ID:")
location = input("Enter location:")
problem = input("Describe the problem:")
print(problem.lower())

print("\n" + "=" * 50)
print("      EQUIPMENT INFORMATION")
print("=" * 50)
print(f"Environment :{environment}")
print(f"Equipment :{environment}")
print(f"Type :{equipment_type}")
print(f"Location :{location}")
print(f"Problem :{problem}")

if problem.lower() == "not starting":
    print("Possible Cause:")
    print("Power supply failure.") 
    print("faulty wiring.")

    print("\nRisk Level")
    print("Meduim")
    
    print("Recommendation: Check the power supply failure or faulty wiring.")
    print("Recommendation: Check the power source and electrical connections.")
elif problem.lower() == "high temperature":
    print("\nDiagnosis")
    print("Possible Cause:") 
    print("Overheating due to overload")
    print("Poor ventilation.")

    print("\nRisk Level")
    print("Medium")

    print("Recommendation:")
    print("Allow the equipment to cool")
    print ("inspect the cooling system.")
elif problem.lower() =="noise":
    print("\nDiagnosis")
    print("Possible Cause:")
    print("-Loose components.")
    print("-Worn-out parts.")

    print("\nRisk Level:")
    print("Medium")

    print("Recommendation:") 
    print("-Inspect and tighten components") 
    print("-Replace damaged parts.")
elif problem.lower() =="smoke":
    print("\nDiagnosis")
    print("Possible Causes:")
    print("-Short circuit")
    print("-Overheating")
    print("-Burnt wiring")
    print("-Overloaded equipment")

    print("\nRisk Level:")
    print("CRITICAL")

    print("\nRecommendations:")
    print("-Switch off power immediately.")
    print("-Do not continue using the equipment.")
    print("-Inspect for burnt components.")
    print("-Contact a qualified technician.")
elif problem.lower() == "constant vibrating":
 print("\nDiagnosis")
 print("Possible Causes:")
 print("-Loose mounting bolts")
 print("-Worn bearings")
 print("-Unbalanced rotating components.")

 print("\nRisk Level:")
 print("High")

 print("\nRecommendations:")
 print("-Tighten all mounting bolts.")
 print("-Inspect the bearings.")
 print("-Balance rotating components.")
     
else:
    print("Diagnosis not available.")
=======
print("=" * 50)
print("      FuElectric-AI 1.0")
print(" AI Equipment Diagnosis System")
print("=" * 50)

environment = input("Select Environment(Home/Office/Factory/School/Hospital):")
equipment = input("Enter Equipment Name:")
equipment_type = input("Enter Equipment Type:")
equipment_id = input("Enter Equipment ID:")
location = input("Enter location:")
problem = input("Describe the problem:")
print(problem.lower())

print("\n" + "=" * 50)
print("      EQUIPMENT INFORMATION")
print("=" * 50)
print(f"Environment :{environment}")
print(f"Equipment :{environment}")
print(f"Type :{equipment_type}")
print(f"Location :{location}")
print(f"Problem :{problem}")

if problem.lower() == "not starting":
    print("Possible Cause:")
    print("Power supply failure.") 
    print("faulty wiring.")

    print("\nRisk Level")
    print("Meduim")
    
    print("Recommendation: Check the power supply failure or faulty wiring.")
    print("Recommendation: Check the power source and electrical connections.")
elif problem.lower() == "high temperature":
    print("\nDiagnosis")
    print("Possible Cause:") 
    print("Overheating due to overload")
    print("Poor ventilation.")

    print("\nRisk Level")
    print("Medium")

    print("Recommendation:")
    print("Allow the equipment to cool")
    print ("inspect the cooling system.")
elif problem.lower() =="noise":
    print("\nDiagnosis")
    print("Possible Cause:")
    print("-Loose components.")
    print("-Worn-out parts.")

    print("\nRisk Level:")
    print("Medium")

    print("Recommendation:") 
    print("-Inspect and tighten components") 
    print("-Replace damaged parts.")
elif problem.lower() =="smoke":
    print("\nDiagnosis")
    print("Possible Causes:")
    print("-Short circuit")
    print("-Overheating")
    print("-Burnt wiring")
    print("-Overloaded equipment")

    print("\nRisk Level:")
    print("CRITICAL")

    print("\nRecommendations:")
    print("-Switch off power immediately.")
    print("-Do not continue using the equipment.")
    print("-Inspect for burnt components.")
    print("-Contact a qualified technician.")
elif problem.lower() == "constant vibrating":
 print("\nDiagnosis")
 print("Possible Causes:")
 print("-Loose mounting bolts")
 print("-Worn bearings")
 print("-Unbalanced rotating components.")

 print("\nRisk Level:")
 print("High")

 print("\nRecommendations:")
 print("-Tighten all mounting bolts.")
 print("-Inspect the bearings.")
 print("-Balance rotating components.")
     
else:
    print("Diagnosis not available.")
>>>>>>> c0af182fb8a282de77faef45c918d62a5fde8b2b
    print("Recommendation: Contact a qualified technician")    