import { downloadCSV, escapeCSVField } from '@/lib/export/team-export';

export interface SampleEmployeeRaw {
  [key: string]: string;
  'Employee Name': string;
  'Gender': string;
  'Office Location': string;
}

export const SAMPLE_EMPLOYEES: SampleEmployeeRaw[] = [
  // Guindy Office (30 employees)
  { 'Employee Name': 'Aarav Patel', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Aditi Rao', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Ananya Sharma', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Ashwin Kumar', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Deepak Sundaram', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Divya Krishnan', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Ganesh Raman', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Harini Venkat', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Jayanth Rajan', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Karthik Subramanian', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Kavitha Natarajan', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Madhavan Iyer', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Meenakshi Chandran', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Muralidharan P', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Nandhini Mohan', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Naveen Balaji', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Nisha Paul', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Pranav Seth', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Pooja Varma', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Raghav Menon', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Ramya Srinivasan', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Rohit Chari', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Sahana Swaminathan', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Sanjay Karthik', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Sneha Nambiar', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Surya Prakash', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Tara Alexander', 'Gender': 'Women', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Vigneshwaran K', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Vinodh Shankar', 'Gender': 'Men', 'Office Location': 'Guindy' },
  { 'Employee Name': 'Yamini Rajagopal', 'Gender': 'Women', 'Office Location': 'Guindy' },

  // Vandaloor Office (26 employees)
  { 'Employee Name': 'Abhinav Sen', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Aishwarya Murugan', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Ajith Kumar', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Archana Pillai', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Bala Chandran', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Bhavani Shankar', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Charan Das', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Deepa Nair', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Dinesh Babu', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Gayathri Raghavan', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Gokul Nathan', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Janani Ramesh', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Kishore Kumar', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Lavanya Sekar', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Manoj Prabhakar', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Mythili Parthasarathy', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Naveen Kumar', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Pavithra Ananth', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Praveen Wilson', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Radhika Joshi', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Ranjith Varma', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Sandhya Gurumurthy', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Siddharth Roy', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Swathi Sridhar', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Varun Gupta', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
  { 'Employee Name': 'Vasanth Narayanan', 'Gender': 'Men', 'Office Location': 'Vandaloor' },
];

/**
 * Downloads a reliable CSV template for employees.
 */
export function downloadSampleCSV(mode: 'single' | 'guindy' | 'vandaloor'): void {
  let filteredData = SAMPLE_EMPLOYEES;
  let fileName = 'employee_template_combined.csv';

  if (mode === 'guindy') {
    filteredData = SAMPLE_EMPLOYEES.filter((e) => e['Office Location'] === 'Guindy');
    fileName = 'employee_template_guindy.csv';
  } else if (mode === 'vandaloor') {
    filteredData = SAMPLE_EMPLOYEES.filter((e) => e['Office Location'] === 'Vandaloor');
    fileName = 'employee_template_vandaloor.csv';
  }

  const headers = ['Employee Name', 'Gender', 'Office Location'];
  const lines = [headers.map(escapeCSVField).join(',')];

  filteredData.forEach((emp) => {
    lines.push(
      [
        escapeCSVField(emp['Employee Name']),
        escapeCSVField(emp['Gender']),
        escapeCSVField(emp['Office Location']),
      ].join(',')
    );
  });

  downloadCSV(lines.join('\r\n'), fileName);
}

// Backward compatible alias
export const downloadSampleExcel = downloadSampleCSV;
