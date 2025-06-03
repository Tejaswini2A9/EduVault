const axios = require('axios');

class Academic {
    /**
     * Fetch academic results from JNTUH API
     * @param {string} htno - Hall ticket number
     * @returns {Promise<Object>} - Academic results
     */
    static async getResults(htno) {
        try {
            console.log(`Fetching results for: ${htno}`);
            let results;
            
            // Fetch results from JNTUH API
            const url = `https://jntuhresults.vercel.app/api/redisdata?htno=${htno}ALL`;
            const response = await axios.get(url);
            
            if (response.status === 200 && response.data) {
                results = response.data;
            } else {
                console.log("Error occurred, no results found in database");
                return { error: "No results found" };
            }
            
            // Process the results
            let overallTotalCredits = 0;
            let overallTotalGradePoints = 0;
            let overallBacklogs = 0;
            let status = "PASS";
            
            // Process each semester's results
            for (const key in results) {
                if (key !== "Details" && results[key] && results[key].Results) {
                    const semesterData = results[key];
                    const semesterResults = semesterData.Results;
                    
                    let totalCredits = 0;
                    let totalGradePoints = 0;
                    let earnedCredits = 0;
                    let backlogs = 0;
                    
                    // Process each subject in the semester
                    for (const subject of semesterResults) {
                        const credits = parseFloat(subject.CREDITS) || 0;
                        const grade = subject.GRADE;
                        
                        if (grade && grade !== "COMPLE" && grade !== "COMPLETED" && grade !== "ABSENT") {
                            totalCredits += credits;
                            
                            // Calculate grade points
                            let gradePoint = 0;
                            switch (grade) {
                                case "O": gradePoint = 10; break;
                                case "A+": gradePoint = 9; break;
                                case "A": gradePoint = 8; break;
                                case "B+": gradePoint = 7; break;
                                case "B": gradePoint = 6; break;
                                case "C": gradePoint = 5; break;
                                case "D": gradePoint = 4; break;
                                case "F": gradePoint = 0; backlogs++; break;
                                default: gradePoint = 0;
                            }
                            
                            totalGradePoints += credits * gradePoint;
                            
                            if (gradePoint >= 4) {
                                earnedCredits += credits;
                            }
                        }
                    }
                    
                    // Calculate semester GPA
                    semesterData.SGPA = (totalGradePoints / totalCredits).toFixed(2);
                    semesterData.CreditsEarned = earnedCredits;
                    semesterData.Backlogs = backlogs;
                    
                    overallTotalCredits += totalCredits;
                    overallTotalGradePoints += totalGradePoints;
                    overallBacklogs += backlogs;
                    
                    if (backlogs > 0) {
                        status = "FAIL";
                    }
                }
            }
            
            // Calculate overall CGPA and percentage
            const cgpa = overallTotalCredits > 0
                ? (overallTotalGradePoints / overallTotalCredits).toFixed(2)
                : 0;
                
            const percentage = (cgpa * 9.5).toFixed(2);
            
            // Add summary to results
            results.Total = {
                TotalCGPA: cgpa,
                TotalBacklogs: overallBacklogs,
                TotalPercentage: percentage,
                TotalCredits: overallTotalCredits,
                current_status: status
            };
            
            return results;
        } catch (error) {
            console.error("Error fetching academic results:", error);
            return { error: "Error fetching results" };
        }
    }
}

module.exports = Academic;
