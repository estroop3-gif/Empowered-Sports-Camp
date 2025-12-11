from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
import requests


class EmpoweredSportsCampApp(App):
    def build(self):
        self.title = "Empowered Sports Camp"

        layout = BoxLayout(orientation='vertical', padding=20, spacing=10)

        self.title_label = Label(
            text="Empowered Sports Camp",
            font_size='24sp',
            size_hint_y=0.2
        )

        self.welcome_label = Label(
            text="Welcome to the mobile app!",
            font_size='18sp',
            size_hint_y=0.2
        )

        self.status_label = Label(
            text="",
            font_size='14sp',
            size_hint_y=0.2
        )

        self.connect_button = Button(
            text="Test Backend Connection",
            size_hint_y=0.2,
            on_press=self.test_connection
        )

        layout.add_widget(self.title_label)
        layout.add_widget(self.welcome_label)
        layout.add_widget(self.connect_button)
        layout.add_widget(self.status_label)

        return layout

    def test_connection(self, instance):
        try:
            response = requests.get("http://localhost:8000/api/hello")
            data = response.json()
            self.status_label.text = data.get("message", "Connected!")
        except Exception as e:
            self.status_label.text = f"Error: {str(e)}"


if __name__ == "__main__":
    EmpoweredSportsCampApp().run()
