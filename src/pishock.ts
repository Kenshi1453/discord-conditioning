enum SHOCK_OPERATIONS {
    SHOCK = 0,
    VIBRATE = 1,
    BEEP = 2
}

class PiShockAPI {
  private API_KEY: string;
  private USERNAME: string;
  private SHARE_CODE: string;
  private API_URL: string;

  constructor(API_KEY: string, USERNAME: string, SHARE_CODE: string, API_URL: string) {
    this.API_KEY = API_KEY;
    this.USERNAME = USERNAME;
    this.SHARE_CODE = SHARE_CODE;
    this.API_URL = API_URL;
  }

  private async send(name: string, duration: number, intensity: number, op: SHOCK_OPERATIONS){
    if (duration < 1 || duration > 15) throw new Error();
    if (intensity < 1 || intensity > 100) throw new Error();
    name = name
    .replaceAll(" ", "_")
    .replaceAll(/[^a-zA-Z0-9_]/g, "")
    .substring(0, 64);
    
    const body = {
        Username: this.USERNAME,
        ApiKey: this.API_KEY,
        Code: this.SHARE_CODE,
        Name: name,
        Op: op.toString(),
        Duration: duration.toString(),
        Intensity: intensity.toString(),
      };
    return await fetch(this.API_URL, {
      body: JSON.stringify(body),
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    })
  }


  /**
   * 
   * @param name name in the logs
   * @param duration number between 1-15
   * @param intensity number between 1-100
   * @returns 
   */
  async sendShock(name: string, duration: number, intensity: number) {
    return await this.send(name, duration, intensity, SHOCK_OPERATIONS.SHOCK)
  }

  /**
   * 
   * @param name name in the logs
   * @param duration number between 1-15
   * @param intensity number between 1-100
   * @returns 
   */
  async sendVibrate(name: string, duration: number, intensity: number) {
    return await this.send(name, duration, intensity, SHOCK_OPERATIONS.VIBRATE)
  }

  /**
   * 
   * @param name name in the logs
   * @param duration number between 1-15
   * @param intensity number between 1-100
   * @returns 
   */
  async sendBeep(name: string, duration: number, intensity: number) {
    return await this.send(name, duration, intensity, SHOCK_OPERATIONS.BEEP)
  }
}

export { PiShockAPI };
