const givenNames = [
  "Aarav", "Aditi", "Aditya", "Aishwarya", "Akash", "Amrita", "Ananya", "Anil",
  "Anushka", "Arjun", "Bhavna", "Charu", "Deepak", "Devika", "Divya", "Gaurav",
  "Harsh", "Ishita", "Karan", "Kavya",
];
const familyNames = ["Joshi", "Kapoor", "Malhotra", "Menon", "Mehta", "Nair"];
const roles = [
  ["Business Unit Head", "Infosys", "IT services", "enterprise software and client operations"],
  ["Product Director", "Microsoft India", "Technology", "cloud products and enterprise procurement"],
  ["Head of Operations", "Tejas Networks", "Telecom", "network equipment and manufacturing scale-up"],
  ["Finance Controller", "Asian Paints", "Consumer", "working capital and distribution economics"],
  ["VP Supply Chain", "Qualcomm India", "Semiconductors", "chip supply chains and vendor qualification"],
  ["Plant Manager", "Micron India", "Electronics", "factory ramp-up and yield improvement"],
  ["Corporate Banking Director", "ICICI Bank", "Financials", "credit underwriting and capital structure"],
  ["Strategy Partner", "Mahindra & Mahindra", "Automobile", "EV programs and auto component sourcing"],
  ["Investor Relations Lead", "Titan Company", "Consumer", "jewellery retail and inventory turns"],
  ["Manufacturing Director", "Dixon Technologies", "Electronics", "EMS operations and customer concentration"],
  ["Renewables Investment Lead", "Oriana Power", "Energy", "project finance and renewable EPC execution"],
  ["Former CFO", "Fusion CX", "Business services", "margin levers and customer retention"],
];

export const sampleNetworkContacts = Array.from({ length: 120 }, (_, index) => {
  const role = roles[index % roles.length];
  const name = `${givenNames[Math.floor(index / familyNames.length)]} ${familyNames[index % familyNames.length]}`;
  const month = (index % 12) + 1;
  const year = 2024 + (index % 3);
  const relationship = index % 3 === 0
    ? "Worked together · first degree"
    : index % 3 === 1
      ? "Studied together · first degree"
      : "One connection away · warm introduction";
  return {
    id: `sample-${String(index + 1).padStart(3, "0")}`,
    name,
    role: role[0],
    company: role[1],
    sector: role[2],
    expertise: role[3],
    relationship,
    last_spoke: `${year}-${String(month).padStart(2, "0")}-15`,
    bio: `${name} is a synthetic demo profile with experience in ${role[3]}. Career details and relationship history are invented for demonstration.`,
    email: `sample.contact.${String(index + 1).padStart(3, "0")}@example.com`,
    synthetic: true,
  };
});
