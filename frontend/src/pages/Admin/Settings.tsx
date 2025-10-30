import { useState } from "react";
import { PhotoIcon, UserCircleIcon } from "@heroicons/react/24/solid";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

export default function UserSettings() {
  const [preview, setPreview] = useState<string | null>(null);

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: send to API
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-12">
        {/* PROFILE */}
        <div className="border-b border-gray-900/10 pb-12">
          <h2 className="text-base/7 font-semibold text-gray-900">Profile</h2>
          <p className="mt-1 text-sm/6 text-gray-600">
            Update your public profile. Your name and avatar may appear on bookings and reviews.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            {/* Username / handle */}
            <div className="sm:col-span-4">
              <label htmlFor="username" className="block text-sm/6 font-medium text-gray-900">
                Username
              </label>
              <div className="mt-2">
                <div className="flex items-center rounded-md bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600">
                  <div className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6">gem.app/</div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="janesmith"
                    className="block min-w-0 grow bg-white py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                  />
                </div>
              </div>
            </div>

            {/* Display name */}
            <div className="sm:col-span-3">
              <label htmlFor="display-name" className="block text-sm/6 font-medium text-gray-900">
                Display name
              </label>
              <div className="mt-2">
                <input
                  id="display-name"
                  name="display-name"
                  type="text"
                  placeholder="Jane Smith"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            {/* About / bio */}
            <div className="col-span-full">
              <label htmlFor="about" className="block text-sm/6 font-medium text-gray-900">
                Bio
              </label>
              <div className="mt-2">
                <textarea
                  id="about"
                  name="about"
                  rows={3}
                  placeholder="Tell guests a little about yourself…"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
              <p className="mt-3 text-sm/6 text-gray-600">A short blurb that appears on your profile.</p>
            </div>

            {/* Avatar */}
            <div className="col-span-full">
              <label htmlFor="photo" className="block text-sm/6 font-medium text-gray-900">
                Photo
              </label>
              <div className="mt-2 flex items-center gap-x-3">
                {preview ? (
                  <img src={preview} alt="Preview" className="size-12 rounded-full object-cover" />
                ) : (
                  <UserCircleIcon aria-hidden="true" className="size-12 text-gray-300" />
                )}
                <label className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 cursor-pointer">
                  Change
                  <input id="photo" name="photo" type="file" accept="image/*" onChange={onAvatarChange} className="sr-only" />
                </label>
              </div>
            </div>

            {/* Cover photo (optional) */}
            <div className="col-span-full">
              <label htmlFor="cover-photo" className="block text-sm/6 font-medium text-gray-900">
                Cover photo (optional)
              </label>
              <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                <div className="text-center">
                  <PhotoIcon aria-hidden="true" className="mx-auto size-12 text-gray-300" />
                  <div className="mt-4 flex text-sm/6 text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md bg-transparent font-semibold text-indigo-600 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-600 hover:text-indigo-500"
                    >
                      <span>Upload a file</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs/5 text-gray-600">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTACT INFO */}
        <div className="border-b border-gray-900/10 pb-12">
          <h2 className="text-base/7 font-semibold text-gray-900">Contact information</h2>
          <p className="mt-1 text-sm/6 text-gray-600">Used for confirmations and account recovery.</p>

          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="first-name" className="block text-sm/6 font-medium text-gray-900">
                First name
              </label>
              <div className="mt-2">
                <input
                  id="first-name"
                  name="first-name"
                  type="text"
                  autoComplete="given-name"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="last-name" className="block text-sm/6 font-medium text-gray-900">
                Last name
              </label>
              <div className="mt-2">
                <input
                  id="last-name"
                  name="last-name"
                  type="text"
                  autoComplete="family-name"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="phone" className="block text-sm/6 font-medium text-gray-900">
                Phone (for SMS)
              </label>
              <div className="mt-2">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(555) 555-1212"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="country" className="block text-sm/6 font-medium text-gray-900">
                Country
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="country"
                  name="country"
                  autoComplete="country-name"
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                >
                  <option>United States</option>
                  <option>Canada</option>
                  <option>Mexico</option>
                </select>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                />
              </div>
            </div>

            {/* Address (optional) */}
            <div className="col-span-full">
              <label htmlFor="street-address" className="block text-sm/6 font-medium text-gray-900">
                Street address (optional)
              </label>
              <div className="mt-2">
                <input
                  id="street-address"
                  name="street-address"
                  type="text"
                  autoComplete="street-address"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div className="sm:col-span-2 sm:col-start-1">
              <label htmlFor="city" className="block text-sm/6 font-medium text-gray-900">
                City
              </label>
              <div className="mt-2">
                <input
                  id="city"
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="region" className="block text-sm/6 font-medium text-gray-900">
                State / Province
              </label>
              <div className="mt-2">
                <input
                  id="region"
                  name="region"
                  type="text"
                  autoComplete="address-level1"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="postal-code" className="block text-sm/6 font-medium text-gray-900">
                ZIP / Postal code
              </label>
              <div className="mt-2">
                <input
                  id="postal-code"
                  name="postal-code"
                  type="text"
                  autoComplete="postal-code"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS (tailored) */}
        <div className="border-b border-gray-900/10 pb-12">
          <h2 className="text-base/7 font-semibold text-gray-900">Notifications</h2>
          <p className="mt-1 text-sm/6 text-gray-600">
            Choose how you want to hear about bookings and messages.
          </p>

          <div className="mt-10 space-y-10">
            <fieldset>
              <legend className="text-sm/6 font-semibold text-gray-900">By email</legend>
              <div className="mt-6 space-y-6">
                <Notif id="booking-reminders" label="Reservation reminders" desc="Get reminders and updates for your upcoming bookings." defaultChecked />
                <Notif id="waitlist-alerts" label="Waitlist status" desc="Be notified when your waitlist spot changes or opens." />
                <Notif id="marketing" label="Promotions & announcements" desc="Occasional news, events, and special offers." />
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm/6 font-semibold text-gray-900">Security</legend>
              <p className="mt-1 text-sm/6 text-gray-600">Critical account alerts can’t be turned off.</p>
              <div className="mt-6">
                <label className="inline-flex items-center gap-3">
                  <input type="checkbox" defaultChecked disabled className="size-4" />
                  <span className="text-sm/6 text-gray-900">Password changes & suspicious activity</span>
                </label>
              </div>
            </fieldset>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-end gap-x-6">
        <button type="button" className="text-sm/6 font-semibold text-gray-900">
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Save
        </button>
      </div>
    </form>
  );
}

/* --- tiny helpers --- */
function Notif({
  id,
  label,
  desc,
  defaultChecked,
}: {
  id: string;
  label: string;
  desc: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 shrink-0 items-center">
        <input
          id={id}
          name={id}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="size-4 rounded-sm border border-gray-300 text-indigo-600 focus:ring-indigo-600"
        />
      </div>
      <div className="text-sm/6">
        <label htmlFor={id} className="font-medium text-gray-900">
          {label}
        </label>
        <p className="text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
